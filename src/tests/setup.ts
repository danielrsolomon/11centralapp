// Add types for jest globals
declare global {
  namespace NodeJS {
    interface Global {
      expect: jest.Expect;
      it: jest.It;
      describe: jest.Describe;
      beforeEach: jest.Hook;
      afterEach: jest.Hook;
      beforeAll: jest.Hook;
      afterAll: jest.Hook;
      jest: typeof jest;
    }
  }
}

// Global Jest configuration
jest.setTimeout(30000); // 30 seconds timeout for tests

// Create mock implementations for File objects in Node environment
if (typeof window === 'undefined') {
  global.File = class File {
    name: string;
    type: string;
    size: number;
    lastModified: number;
    
    constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
      this.name = name;
      this.type = options?.type || '';
      this.size = bits.reduce((acc, bit) => acc + (bit.toString().length || 0), 0);
      this.lastModified = options?.lastModified || Date.now();
    }
    
    slice(): Blob {
      return new Blob();
    }
    
    stream(): ReadableStream {
      throw new Error('Not implemented');
    }
    
    text(): Promise<string> {
      return Promise.resolve('');
    }
    
    arrayBuffer(): Promise<ArrayBuffer> {
      return Promise.resolve(new ArrayBuffer(0));
    }
  } as any;
}

export {}; 