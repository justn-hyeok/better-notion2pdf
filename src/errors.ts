export class PdfTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfTimeoutError';
    Object.setPrototypeOf(this, PdfTimeoutError.prototype);
  }
}

export class PdfAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfAuthError';
    Object.setPrototypeOf(this, PdfAuthError.prototype);
  }
}

export class PdfOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfOutputError';
    Object.setPrototypeOf(this, PdfOutputError.prototype);
  }
}
