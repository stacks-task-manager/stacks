export default {
    admin: {
        username: process.env.E2E_ADMIN_EMAIL ?? "admin@example.com",
        password: process.env.E2E_ADMIN_PASSWORD ?? "admin123",
    },
    invalid: {
        username: "invalid@example.com",
        password: "test",
    },
};
