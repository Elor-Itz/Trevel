import initApp from "../server";
import mongoose from "mongoose";
import path from "path";
import { resolveFilePath } from "../utils/fileService";

let server: any;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.PORT = "4000";
  console.log(`beforeAll - NODE_ENV: ${process.env.NODE_ENV}, PORT: ${process.env.PORT}`);

  const app = await initApp();
  server = app.listen(process.env.PORT || 4000, () => {
    console.log(`Test server running on port ${process.env.PORT || 4000}`);
  });
});

afterAll(async () => {
  console.log("afterAll");
  if (server) {
    server.close(() => {
      console.log("Test server stopped");
    });
  }
  await mongoose.connection.close();
});

// Test initApp
describe("InitApp Test", () => {
  test("Test if MongoDB is set", async () => {
    const originalMongoUri = process.env.DB_CONNECT;
    delete process.env.DB_CONNECT;

    try {
      await initApp();
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe("DB_CONNECT is not defined in .env file");
      }
    }

    process.env.DB_CONNECT = originalMongoUri;
  });
});

// Test resolveFilePath
describe('resolveFilePath', () => {
  it('should resolve the full path to a file based on the provided relative path', () => {
    const relativePath = 'uploads/test.txt';
    const expectedPath = path.join(__dirname, '../../', 'uploads/test.txt');

    const result = resolveFilePath(relativePath);
    expect(result).toBe(expectedPath);
    });

  it('should handle an empty relative path', () => {
    const result = resolveFilePath('');  
    expect(result).toBe('');
    });
});

