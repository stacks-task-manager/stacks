// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const fs = require('fs');
const path = require('path');

/**
 * Script to generate migration code from entity files
 * This script reads all entity files and generates the up() function for migrations
 */

const ENTITY_DIR = path.join(__dirname, '../src/entity');
const MIGRATION_FILE = path.join(__dirname, '../migrations/001_initial_schema.js');

// Map TypeScript DataTypes to Sequelize migration format
const mapDataType = (typeStr) => {
    if (typeStr.includes('DataTypes.UUID')) return 'Sequelize.UUID';
    if (typeStr.includes('DataTypes.STRING')) return 'Sequelize.STRING';
    if (typeStr.includes('DataTypes.TEXT')) return 'Sequelize.TEXT';
    if (typeStr.includes('DataTypes.INTEGER')) return 'Sequelize.INTEGER';
    if (typeStr.includes('DataTypes.FLOAT')) return 'Sequelize.FLOAT';
    if (typeStr.includes('DataTypes.BOOLEAN')) return 'Sequelize.BOOLEAN';
    if (typeStr.includes('DataTypes.DATE')) return 'Sequelize.DATE';
    if (typeStr.includes('DataTypes.JSONB')) return 'Sequelize.JSONB';
    if (typeStr.includes('DataTypes.ENUM')) {
        // Extract enum values from the string, handling spread operator
        const enumMatch = typeStr.match(/DataTypes\.ENUM\(([^)]+)\)/);
        if (enumMatch) {
            let enumValues = enumMatch[1].trim();
            // Handle spread operator with Object.values
            if (enumValues.includes('...Object.values(')) {
                // Extract the constant name and convert to direct enum values
                const constantMatch = enumValues.match(/\.\.\.Object\.values\(([^)]+)\)/);
                if (constantMatch) {
                    const constantName = constantMatch[1];
                    // Map known constants to their actual enum values
                    const enumMappings = {
                        'FILES_TYPE': ['"task_attachment"', '"task_cover"', '"avatar"', '"company_logo"', '"notepad_cover"', '"notepad_file"', '"file"'],
                        'RECORDTYPE': ['"folder"', '"project"', '"notepad"', '"goal"', '"keep"', '"people"', '"timebox"', '"file"', '"task"', '"archived"', '"person"', '"company"', '"attachment"', '"comment"', '"bookmark"', '"url"', '"inbox"', '"todos"'],
                        'TAGSECTION': ['"projects"', '"people"', '"timebox"'],
                        'TAGTYPE': ['"tag"', '"status"'],
                        'TIMELOG_STATUS': ['"pending"', '"approved"', '"rejected"', '"inreview"'],
                        'PEOPLE_GENDER': ['"male"', '"female"', '"other"'],
                        'USER_ONLINE_STATUS': ['"offline"', '"online"', '"idle"']
                    };
                    
                    if (enumMappings[constantName]) {
                        return `Sequelize.ENUM(${enumMappings[constantName].join(', ')})`;
                    }
                    return `Sequelize.ENUM /* Unknown enum: ${constantName} */`;
                }
            }
            return `Sequelize.ENUM(${enumValues})`;
        }
        return 'Sequelize.ENUM';
    }
    if (typeStr.includes('DataTypes.UUIDV4')) return 'Sequelize.UUIDV4';
    if (typeStr.includes('DataTypes.NOW')) return 'Sequelize.NOW';
    return typeStr.replace(/DataTypes\./g, 'Sequelize.');
};

// Parse entity file to extract table definition
const parseEntityFile = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, '.ts');
    
    // Skip Base.ts as it's not a table entity
    if (fileName === 'Base') return null;
    
    // Extract table name from tableName property
    const tableNameMatch = content.match(/tableName:\s*["']([^"']+)["']/);
    if (!tableNameMatch) {
        console.warn(`No tableName found in ${fileName}, skipping...`);
        return null;
    }
    
    const tableName = tableNameMatch[1];
    const fields = {};
    const indexes = [];
    
    // Check if entity uses BaseEntity.initialize or direct .init
    const usesBaseInitialize = content.includes('.initialize(');
    
    // Extract field definitions
    const fieldRegex = /(\w+):\s*{([^}]+)}/g;
    let match;
    
    while ((match = fieldRegex.exec(content)) !== null) {
        const fieldName = match[1];
        const fieldDef = match[2];
        
        // Skip if this looks like an options object rather than a field
        if (fieldName === 'tableName' || fieldName === 'sequelize' || fieldName === 'createdAt' || fieldName === 'updatedAt') {
            continue;
        }
        
        const field = {};
        
        // Extract type
        const typeMatch = fieldDef.match(/type:\s*([^,]+)/);
        if (typeMatch) {
            field.type = mapDataType(typeMatch[1].trim());
        }
        
        // Extract allowNull
        const allowNullMatch = fieldDef.match(/allowNull:\s*(true|false)/);
        if (allowNullMatch) {
            field.allowNull = allowNullMatch[1] === 'true';
        }
        
        // Extract defaultValue
        const defaultMatch = fieldDef.match(/defaultValue:\s*([^,]+)/);
        if (defaultMatch) {
            let defaultValue = defaultMatch[1].trim();
            if (defaultValue.includes('DataTypes.UUIDV4')) {
                field.defaultValue = 'Sequelize.UUIDV4';
            } else if (defaultValue.includes('DataTypes.NOW')) {
                field.defaultValue = 'Sequelize.NOW';
            } else if (defaultValue === 'true' || defaultValue === 'false') {
                field.defaultValue = defaultValue === 'true';
            } else if (defaultValue.startsWith('"') || defaultValue.startsWith("'")) {
                field.defaultValue = defaultValue;
            } else if (!isNaN(defaultValue)) {
                field.defaultValue = Number(defaultValue);
            } else if (defaultValue === '[]' || defaultValue === '{}') {
                field.defaultValue = defaultValue;
            } else {
                field.defaultValue = defaultValue;
            }
        }
        
        // Extract primaryKey
        if (fieldDef.includes('primaryKey: true')) {
            field.primaryKey = true;
        }
        
        fields[fieldName] = field;
    }
    
    // Add base fields if entity uses BaseEntity.initialize
    if (usesBaseInitialize) {
        // Add base fields that are automatically added by BaseEntity
        if (!fields.id) {
            fields.id = {
                type: 'Sequelize.UUID',
                defaultValue: 'Sequelize.UUIDV4',
                primaryKey: true,
                allowNull: false
            };
        }
        if (!fields.tenant) {
            fields.tenant = {
                type: 'Sequelize.UUID',
                allowNull: false
            };
        }
        if (!fields.createdBy) {
            fields.createdBy = {
                type: 'Sequelize.UUID',
                allowNull: false
            };
        }
        if (!fields.updatedBy) {
            fields.updatedBy = {
                type: 'Sequelize.UUID',
                allowNull: false
            };
        }
        if (!fields.deletedBy) {
            fields.deletedBy = {
                type: 'Sequelize.UUID',
                allowNull: true
            };
        }
        if (!fields.created) {
            fields.created = {
                type: 'Sequelize.DATE',
                defaultValue: 'Sequelize.NOW',
                allowNull: false
            };
        }
        if (!fields.updated) {
            fields.updated = {
                type: 'Sequelize.DATE',
                defaultValue: 'Sequelize.NOW',
                allowNull: false
            };
        }
        if (!fields.deleted) {
            fields.deleted = {
                type: 'Sequelize.DATE',
                allowNull: true
            };
        }
    }
    
    // Extract indexes
    const indexMatch = content.match(/indexes:\s*\[([^\]]+)\]/);
    if (indexMatch) {
        const indexContent = indexMatch[1];
        const uniqueMatch = indexContent.match(/unique:\s*true/);
        const fieldsMatch = indexContent.match(/fields:\s*\[([^\]]+)\]/);
        
        if (fieldsMatch) {
            const indexFields = fieldsMatch[1].split(',').map(f => f.trim().replace(/["\']/g, ''));
            indexes.push({
                unique: !!uniqueMatch,
                fields: indexFields
            });
        }
    }
    
    return {
        tableName,
        fields,
        indexes,
        fileName
    };
};

// Generate migration code for a table
const generateTableMigration = (tableInfo) => {
    const { tableName, fields, indexes } = tableInfo;
    
    let migration = `        await queryInterface.createTable('${tableName}', {\n`;
    
    // Add fields
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
        migration += `            ${fieldName}: {\n`;
        migration += `                type: ${fieldDef.type}`;
        
        if (fieldDef.defaultValue !== undefined) {
            if (typeof fieldDef.defaultValue === 'string' && 
                !fieldDef.defaultValue.startsWith('Sequelize.') && 
                !fieldDef.defaultValue.startsWith('"') && 
                !fieldDef.defaultValue.startsWith("'") &&
                fieldDef.defaultValue !== '[]' && 
                fieldDef.defaultValue !== '{}') {
                migration += `,\n                defaultValue: "${fieldDef.defaultValue}"`;
            } else {
                migration += `,\n                defaultValue: ${fieldDef.defaultValue}`;
            }
        }
        
        if (fieldDef.primaryKey) {
            migration += `,\n                primaryKey: true`;
        }
        
        if (fieldDef.allowNull !== undefined) {
            migration += `,\n                allowNull: ${fieldDef.allowNull}`;
        }
        
        migration += `\n            },\n`;
    }
    
    migration += `        });\n`;
    
    // Add indexes
    if (indexes.length > 0) {
        for (const index of indexes) {
            migration += `\n        await queryInterface.addIndex('${tableName}', {\n`;
            migration += `            fields: [${index.fields.map(f => `'${f}'`).join(', ')}]`;
            if (index.unique) {
                migration += `,\n            unique: true`;
            }
            migration += `\n        });\n`;
        }
    }
    
    return migration;
};

// Generate down migration code for a table
const generateTableDownMigration = (tableInfo) => {
    return `        await queryInterface.dropTable('${tableInfo.tableName}');\n`;
};

// Main function to generate migration
const generateMigration = () => {
    console.log('Generating migration from entity files...');
    
    // Read all entity files
    const entityFiles = fs.readdirSync(ENTITY_DIR)
        .filter(file => file.endsWith('.ts'))
        .map(file => path.join(ENTITY_DIR, file));
    
    const tables = [];
    
    // Parse each entity file
    for (const filePath of entityFiles) {
        try {
            const tableInfo = parseEntityFile(filePath);
            if (tableInfo) {
                tables.push(tableInfo);
                console.log(`Parsed table: ${tableInfo.tableName}`);
            }
        } catch (error) {
            console.error(`Error parsing ${filePath}:`, error.message);
        }
    }
    
    // Generate migration code
    let upMigration = '';
    let downMigration = '';
    
    for (const table of tables) {
        upMigration += generateTableMigration(table) + '\n';
        downMigration += generateTableDownMigration(table);
    }
    
    // Read current migration file
    const migrationContent = fs.readFileSync(MIGRATION_FILE, 'utf8');
    
    // Replace the up function content
    const newMigrationContent = migrationContent.replace(
        /(async up\(queryInterface, Sequelize\) \{)[\s\S]*?(\n    \},)/,
        `$1\n${upMigration.trim()}\n    $2`
    ).replace(
        /(async down\(queryInterface, Sequelize\) \{)[\s\S]*?(\n    \},)/,
        `$1\n${downMigration.trim()}\n    $2`
    );
    
    // Write updated migration file
    fs.writeFileSync(MIGRATION_FILE, newMigrationContent);
    
    console.log(`Migration updated successfully!`);
    console.log(`Generated ${tables.length} table(s): ${tables.map(t => t.tableName).join(', ')}`);
};

// Run the migration generator
if (require.main === module) {
    generateMigration();
}

module.exports = { generateMigration };