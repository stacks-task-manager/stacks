// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const fs = require('fs');
const path = require('path');

// Define the enum mappings based on the types package
const ENUM_MAPPINGS = {
    FILES_TYPE: ['"task_attachment"', '"task_cover"', '"avatar"', '"company_logo"', '"notepad_cover"', '"notepad_file"', '"file"'],
    RECORDTYPE: ['"folder"', '"project"', '"notepad"', '"goal"', '"keep"', '"people"', '"timebox"', '"file"', '"task"', '"archived"', '"person"', '"company"', '"attachment"', '"comment"', '"bookmark"', '"url"', '"inbox"', '"todos"'],
    TAGSECTION: ['"projects"', '"people"', '"timebox"'],
    TAGTYPE: ['"tag"', '"status"'],
    TIMELOG_STATUS: ['"pending"', '"approved"', '"rejected"', '"inreview"'],
    PEOPLE_GENDER: ['"male"', '"female"', '"other"'],
    USER_ONLINE_STATUS: ['"offline"', '"online"', '"idle"']
};

// Table definitions based on entity analysis
const TABLE_DEFINITIONS = {
    activities: {
        resourceId: { type: 'Sequelize.UUID', allowNull: false },
        resourceType: { type: 'Sequelize.STRING', allowNull: false },
        parent: { type: 'Sequelize.UUID', allowNull: true },
        title: { type: 'Sequelize.STRING', allowNull: true },
        person: { type: 'Sequelize.UUID', allowNull: false },
        content: { type: 'Sequelize.STRING', allowNull: true },
        type: { type: 'Sequelize.STRING', allowNull: false },
        change: { type: 'Sequelize.JSONB', defaultValue: '{}', allowNull: true },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    attachments: {
        fileId: { type: 'Sequelize.UUID', allowNull: false },
        recordId: { type: 'Sequelize.UUID', allowNull: false },
        hasPreview: { type: 'Sequelize.BOOLEAN', defaultValue: false, allowNull: false },
        originalName: { type: 'Sequelize.STRING', allowNull: false },
        type: { type: `Sequelize.ENUM(${ENUM_MAPPINGS.FILES_TYPE.join(', ')})`, allowNull: false, defaultValue: '"file"' },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    bookmarks: {
        title: { type: 'Sequelize.STRING', allowNull: false },
        type: { type: 'Sequelize.STRING', allowNull: false },
        url: { type: 'Sequelize.STRING', allowNull: false },
        pinned: { type: 'Sequelize.BOOLEAN', defaultValue: false, allowNull: false },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    calendar: {
        resourceId: { type: 'Sequelize.UUID', allowNull: false },
        resourceType: { type: 'Sequelize.STRING', allowNull: false },
        parent: { type: 'Sequelize.UUID', allowNull: true },
        title: { type: 'Sequelize.STRING', allowNull: true },
        person: { type: 'Sequelize.UUID', allowNull: false },
        content: { type: 'Sequelize.STRING', allowNull: true },
        type: { type: 'Sequelize.STRING', allowNull: false },
        change: { type: 'Sequelize.JSONB', defaultValue: '{}', allowNull: true },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    companies: {
        title: { type: 'Sequelize.STRING', allowNull: false },
        industry: { type: 'Sequelize.STRING', allowNull: true },
        notes: { type: 'Sequelize.STRING', allowNull: true },
        altCode: { type: 'Sequelize.STRING', allowNull: true },
        logo: { type: 'Sequelize.STRING', allowNull: true },
        website: { type: 'Sequelize.STRING', allowNull: true },
        email: { type: 'Sequelize.STRING', allowNull: true },
        phone: { type: 'Sequelize.STRING', allowNull: true },
        cell: { type: 'Sequelize.STRING', allowNull: true },
        fax: { type: 'Sequelize.STRING', allowNull: true },
        address: { type: 'Sequelize.STRING', allowNull: true },
        county: { type: 'Sequelize.STRING', allowNull: true },
        zip: { type: 'Sequelize.STRING', allowNull: true },
        city: { type: 'Sequelize.STRING', allowNull: true },
        country: { type: 'Sequelize.STRING', allowNull: true },
        address2: { type: 'Sequelize.STRING', allowNull: true },
        registeredOfficeAddress: { type: 'Sequelize.STRING', allowNull: true },
        registeredOfficeCounty: { type: 'Sequelize.STRING', allowNull: true },
        registeredOfficeZip: { type: 'Sequelize.STRING', allowNull: true },
        registeredOfficeCity: { type: 'Sequelize.STRING', allowNull: true },
        registeredOfficeCountry: { type: 'Sequelize.STRING', allowNull: true },
        registeredOfficeAddress2: { type: 'Sequelize.STRING', allowNull: true },
        billingAddress: { type: 'Sequelize.STRING', allowNull: true },
        billingCounty: { type: 'Sequelize.STRING', allowNull: true },
        billingZip: { type: 'Sequelize.STRING', allowNull: true },
        billingCity: { type: 'Sequelize.STRING', allowNull: true },
        billingCountry: { type: 'Sequelize.STRING', allowNull: true },
        billingAddress2: { type: 'Sequelize.STRING', allowNull: true },
        shippingAddress: { type: 'Sequelize.STRING', allowNull: true },
        shippingCounty: { type: 'Sequelize.STRING', allowNull: true },
        shippingZip: { type: 'Sequelize.STRING', allowNull: true },
        shippingCity: { type: 'Sequelize.STRING', allowNull: true },
        shippingCountry: { type: 'Sequelize.STRING', allowNull: true },
        shippingAddress2: { type: 'Sequelize.STRING', allowNull: true },
        payment: { type: 'Sequelize.STRING', allowNull: true },
        vat: { type: 'Sequelize.STRING', allowNull: true },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    documents: {
        title: { type: 'Sequelize.STRING', allowNull: false },
        parent: { type: 'Sequelize.UUID', allowNull: true, defaultValue: 'null' },
        type: { type: `Sequelize.ENUM(${ENUM_MAPPINGS.RECORDTYPE.join(', ')})`, allowNull: false },
        tint: { type: 'Sequelize.STRING', allowNull: true },
        order: { type: 'Sequelize.INTEGER', allowNull: true, defaultValue: 0 },
        hidden: { type: 'Sequelize.BOOLEAN', allowNull: true, defaultValue: false },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    email_queue: {
        id: { type: 'Sequelize.INTEGER', primaryKey: true, autoIncrement: true },
        userId: { type: 'Sequelize.UUID', allowNull: false },
        template: { type: 'Sequelize.STRING', allowNull: false },
        data: { type: 'Sequelize.JSONB', allowNull: false, defaultValue: '{}' },
        status: { type: 'Sequelize.ENUM("pending", "sent", "failed")', allowNull: false, defaultValue: '"pending"' },
        sentAt: { type: 'Sequelize.DATE', allowNull: true },
        failureReason: { type: 'Sequelize.TEXT', allowNull: true },
        retryCount: { type: 'Sequelize.INTEGER', allowNull: false, defaultValue: 0 },
        scheduledAt: { type: 'Sequelize.DATE', allowNull: true, defaultValue: 'Sequelize.NOW' },
        locale: { type: 'Sequelize.STRING', allowNull: false, defaultValue: '"en"' }
    },
    events: {
        title: { type: 'Sequelize.STRING', allowNull: false },
        description: { type: 'Sequelize.STRING', allowNull: true },
        start: { type: 'Sequelize.DATE', allowNull: false },
        end: { type: 'Sequelize.DATE', allowNull: false },
        allDay: { type: 'Sequelize.BOOLEAN', allowNull: true, defaultValue: false },
        assignees: { type: 'Sequelize.JSONB', allowNull: true, defaultValue: '[]' },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    files: {
        hash: { type: 'Sequelize.STRING', allowNull: false },
        mimeType: { type: 'Sequelize.STRING', allowNull: false },
        size: { type: 'Sequelize.INTEGER', allowNull: false },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    notepads: {
        content: { type: 'Sequelize.TEXT', allowNull: true, defaultValue: '""' },
        cover: { type: 'Sequelize.STRING', allowNull: true },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    notifications: {
        title: { type: 'Sequelize.STRING', allowNull: false },
        content: { type: 'Sequelize.STRING', allowNull: true },
        type: { type: 'Sequelize.STRING', allowNull: false },
        read: { type: 'Sequelize.BOOLEAN', allowNull: false, defaultValue: false },
        userId: { type: 'Sequelize.UUID', allowNull: false },
        resourceId: { type: 'Sequelize.UUID', allowNull: true },
        resourceType: { type: 'Sequelize.STRING', allowNull: true },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    permissions: {
        name: { type: 'Sequelize.STRING', allowNull: false },
        description: { type: 'Sequelize.STRING', allowNull: true },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    preferences: {
        key: { type: 'Sequelize.STRING', allowNull: false },
        value: { type: 'Sequelize.JSONB', allowNull: false },
        userId: { type: 'Sequelize.UUID', allowNull: false },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    projects: {
        title: { type: 'Sequelize.STRING', allowNull: false },
        description: { type: 'Sequelize.STRING', allowNull: true },
        status: { type: 'Sequelize.STRING', allowNull: true },
        priority: { type: 'Sequelize.STRING', allowNull: true },
        startDate: { type: 'Sequelize.DATE', allowNull: true },
        endDate: { type: 'Sequelize.DATE', allowNull: true },
        budget: { type: 'Sequelize.FLOAT', allowNull: true },
        spent: { type: 'Sequelize.FLOAT', allowNull: true, defaultValue: 0 },
        assignees: { type: 'Sequelize.JSONB', allowNull: true, defaultValue: '[]' },
        tags: { type: 'Sequelize.JSONB', allowNull: true, defaultValue: '[]' },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    reminders: {
        title: { type: 'Sequelize.STRING', allowNull: false },
        description: { type: 'Sequelize.STRING', allowNull: true },
        dueDate: { type: 'Sequelize.DATE', allowNull: false },
        completed: { type: 'Sequelize.BOOLEAN', allowNull: false, defaultValue: false },
        userId: { type: 'Sequelize.UUID', allowNull: false },
        resourceId: { type: 'Sequelize.UUID', allowNull: true },
        resourceType: { type: 'Sequelize.STRING', allowNull: true },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    roles: {
        name: { type: 'Sequelize.STRING', allowNull: false },
        description: { type: 'Sequelize.STRING', allowNull: true },
        permissions: { type: 'Sequelize.JSONB', allowNull: true, defaultValue: '[]' },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    stacks: {
        title: { type: 'Sequelize.STRING', allowNull: false },
        description: { type: 'Sequelize.STRING', allowNull: true },
        type: { type: 'Sequelize.STRING', allowNull: false },
        config: { type: 'Sequelize.JSONB', allowNull: true, defaultValue: '{}' },
        order: { type: 'Sequelize.INTEGER', allowNull: true, defaultValue: 0 },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    tags: {
        title: { type: 'Sequelize.STRING', allowNull: false },
        color: { type: 'Sequelize.STRING', allowNull: true },
        section: { type: `Sequelize.ENUM(${ENUM_MAPPINGS.TAGSECTION.join(', ')})`, allowNull: false },
        type: { type: `Sequelize.ENUM(${ENUM_MAPPINGS.TAGTYPE.join(', ')})`, allowNull: false },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    tasks: {
        title: { type: 'Sequelize.STRING', allowNull: false },
        description: { type: 'Sequelize.STRING', allowNull: true },
        status: { type: 'Sequelize.STRING', allowNull: true },
        priority: { type: 'Sequelize.STRING', allowNull: true },
        dueDate: { type: 'Sequelize.DATE', allowNull: true },
        completedDate: { type: 'Sequelize.DATE', allowNull: true },
        estimatedHours: { type: 'Sequelize.FLOAT', allowNull: true },
        actualHours: { type: 'Sequelize.FLOAT', allowNull: true, defaultValue: 0 },
        projectId: { type: 'Sequelize.UUID', allowNull: true },
        assignees: { type: 'Sequelize.JSONB', allowNull: true, defaultValue: '[]' },
        tags: { type: 'Sequelize.JSONB', allowNull: true, defaultValue: '[]' },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    tenants: {
        name: { type: 'Sequelize.STRING', allowNull: false },
        domain: { type: 'Sequelize.STRING', allowNull: true },
        settings: { type: 'Sequelize.JSONB', allowNull: true, defaultValue: '{}' },
        disabled: { type: 'Sequelize.BOOLEAN', allowNull: true, defaultValue: false },
        expiry: { type: 'Sequelize.DATE', allowNull: false },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false }
    },
    timelogs: {
        description: { type: 'Sequelize.STRING', allowNull: false },
        date: { type: 'Sequelize.DATE', allowNull: false },
        duration: { type: 'Sequelize.INTEGER', allowNull: false },
        billable: { type: 'Sequelize.BOOLEAN', allowNull: true, defaultValue: false },
        billed: { type: 'Sequelize.BOOLEAN', allowNull: true, defaultValue: false },
        person: { type: 'Sequelize.UUID', allowNull: false },
        project: { type: 'Sequelize.UUID', allowNull: false },
        task: { type: 'Sequelize.UUID', allowNull: false },
        status: { type: `Sequelize.ENUM(${ENUM_MAPPINGS.TIMELOG_STATUS.join(', ')})`, allowNull: true, defaultValue: '"pending"' },
        approvedBy: { type: 'Sequelize.UUID', allowNull: true, defaultValue: 'null' },
        approvedOn: { type: 'Sequelize.DATE', allowNull: true, defaultValue: 'null' },
        rejectReason: { type: 'Sequelize.STRING', allowNull: true, defaultValue: 'null' },
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true, allowNull: false },
        tenant: { type: 'Sequelize.UUID', allowNull: false },
        createdBy: { type: 'Sequelize.UUID', allowNull: false },
        updatedBy: { type: 'Sequelize.UUID', allowNull: false },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    },
    users: {
        id: { type: 'Sequelize.UUID', defaultValue: 'Sequelize.UUIDV4', primaryKey: true },
        email: { type: 'Sequelize.STRING', allowNull: false },
        password: { type: 'Sequelize.STRING', allowNull: false },
        firstName: { type: 'Sequelize.STRING', allowNull: false },
        lastName: { type: 'Sequelize.STRING', allowNull: false },
        avatar: { type: 'Sequelize.STRING', allowNull: true },
        gender: { type: `Sequelize.ENUM(${ENUM_MAPPINGS.PEOPLE_GENDER.join(', ')})`, allowNull: true, defaultValue: '"other"' },
        nickname: { type: 'Sequelize.STRING', allowNull: true },
        title: { type: 'Sequelize.STRING', allowNull: true },
        jobTitle: { type: 'Sequelize.STRING', allowNull: true },
        company: { type: 'Sequelize.UUID', allowNull: true },
        officePhone: { type: 'Sequelize.STRING', allowNull: true },
        cellPhone: { type: 'Sequelize.STRING', allowNull: true },
        homePhone: { type: 'Sequelize.STRING', allowNull: true },
        fax: { type: 'Sequelize.STRING', allowNull: true },
        address: { type: 'Sequelize.STRING', allowNull: true },
        county: { type: 'Sequelize.STRING', allowNull: true },
        zip: { type: 'Sequelize.STRING', allowNull: true },
        city: { type: 'Sequelize.STRING', allowNull: true },
        country: { type: 'Sequelize.STRING', allowNull: true },
        address2: { type: 'Sequelize.STRING', allowNull: true },
        website: { type: 'Sequelize.STRING', allowNull: true },
        notes: { type: 'Sequelize.STRING', allowNull: true },
        socialTwitter: { type: 'Sequelize.STRING', allowNull: true },
        socialFacebook: { type: 'Sequelize.STRING', allowNull: true },
        socialLinkedin: { type: 'Sequelize.STRING', allowNull: true },
        socialInstagram: { type: 'Sequelize.STRING', allowNull: true },
        socialOther: { type: 'Sequelize.STRING', allowNull: true },
        personalId: { type: 'Sequelize.STRING', allowNull: true },
        userId: { type: 'Sequelize.STRING', allowNull: true },
        tags: { type: 'Sequelize.JSONB', allowNull: true, defaultValue: '[]' },
        status: { type: 'Sequelize.STRING', allowNull: true },
        role: { type: 'Sequelize.UUID', allowNull: false },
        birthday: { type: 'Sequelize.DATE', allowNull: true },
        tenant: { type: 'Sequelize.STRING', allowNull: false },
        admin: { type: 'Sequelize.BOOLEAN', allowNull: true, defaultValue: false },
        real: { type: 'Sequelize.BOOLEAN', allowNull: true, defaultValue: false },
        onlineStatus: { type: `Sequelize.ENUM(${ENUM_MAPPINGS.USER_ONLINE_STATUS.join(', ')})`, allowNull: true },
        disabled: { type: 'Sequelize.BOOLEAN', allowNull: true, defaultValue: false },
        system: { type: 'Sequelize.BOOLEAN', allowNull: true, defaultValue: false },
        token: { type: 'Sequelize.STRING', allowNull: true, defaultValue: 'null' },
        oauthTokens: { type: 'Sequelize.JSONB', allowNull: true, defaultValue: '{}' },
        deletedBy: { type: 'Sequelize.UUID', allowNull: true },
        lastOnline: { type: 'Sequelize.DATE', allowNull: true },
        created: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        updated: { type: 'Sequelize.DATE', defaultValue: 'Sequelize.NOW', allowNull: false },
        deleted: { type: 'Sequelize.DATE', allowNull: true }
    }
};

function generateFieldDefinition(field) {
    let definition = `                type: ${field.type}`;
    
    if (field.defaultValue !== undefined) {
        definition += `,\n                defaultValue: ${field.defaultValue}`;
    }
    
    if (field.primaryKey) {
        definition += `,\n                primaryKey: true`;
    }
    
    if (field.allowNull !== undefined) {
        definition += `,\n                allowNull: ${field.allowNull}`;
    }
    
    if (field.autoIncrement) {
        definition += `,\n                autoIncrement: true`;
    }
    
    return definition;
}

function generateTableMigration(tableName, fields) {
    let migration = `        await queryInterface.createTable('${tableName}', {\n`;
    
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
        migration += `            ${fieldName}: {\n`;
        migration += generateFieldDefinition(fieldDef);
        migration += `\n            },\n`;
    }
    
    migration += `        });\n\n`;
    return migration;
}

function generateMigration() {
    let migrationContent = `"use strict";

/**
 * Initial schema migration
 * This migration creates the basic table structure for the application
 */
module.exports = {
    async up(queryInterface, Sequelize) {
`;

    // Generate table creation statements
    for (const [tableName, fields] of Object.entries(TABLE_DEFINITIONS)) {
        migrationContent += generateTableMigration(tableName, fields);
    }

    migrationContent += `    },

    async down(queryInterface, Sequelize) {
`;

    // Generate table drop statements
    for (const tableName of Object.keys(TABLE_DEFINITIONS)) {
        migrationContent += `        await queryInterface.dropTable('${tableName}');\n`;
    }

    migrationContent += `    },\n};\n`;

    return migrationContent;
}

function createMigrationFile() {
    const migrationContent = generateMigration();
    const migrationPath = path.join(__dirname, '../migrations/001_initial_schema.js');
    
    fs.writeFileSync(migrationPath, migrationContent);
    console.log(`Migration file created successfully at: ${migrationPath}`);
    console.log(`Generated ${Object.keys(TABLE_DEFINITIONS).length} tables`);
}

if (require.main === module) {
    createMigrationFile();
}

module.exports = { createMigrationFile, generateMigration };