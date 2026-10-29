import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "EJob API",
      version: "1.0.0",
      description: "API for onboarding and authentication on the EJob platform.",
    },
    // Relative URL, so "Try it out" works on localhost and in production
    servers: [{ url: "/api" }],
    tags: [
      { name: "Onboarding", description: "Sign up, verify and complete a profile" },
      { name: "Auth", description: "Log in" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Something went wrong" },
          },
        },
        UserSummary: {
          type: "object",
          properties: {
            id: { type: "string", example: "665f1c2e9b1e8a0012a4b7c3" },
            role: { type: "string", enum: ["jobseeker", "employer", "agent"] },
            firstName: { type: "string", example: "Adaeze" },
            lastName: { type: "string", example: "Okafor" },
            email: { type: "string", format: "email" },
            phoneNumber: { type: "string", example: "08012345678" },
          },
        },
      },
    },
  },
  // Paths are relative to where you run `node` (usually the backend root)
  apis: ["./controllers/*.js"],
};

export default swaggerJsdoc(options);