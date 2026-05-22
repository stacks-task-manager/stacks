// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
module.exports = {
    development: {
        username: process.env.POSTGRES_USER ?? "postgres",
        password: process.env.POSTGRES_PASSWORD ?? "postgres",
        database: process.env.POSTGRES_DB ?? "stacks_hono",
        host: process.env.POSTGRES_HOST ?? "localhost",
        port: process.env.POSTGRES_PORT || 5432,
        dialect: "postgres",
        logging: process.env.DEBUG_DB === "true" ? console.log : false,
    },
    test: {
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB + "_test",
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT || 5432,
        dialect: "postgres",
        logging: false,
    },
    production: {
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT || 5432,
        dialect: "postgres",
        logging: false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    },
};
