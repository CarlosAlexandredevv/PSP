interface ValidationIssue {
  field: string;
  message: string;
}

export class UnprocessableEntityError extends Error {
  readonly statusCode = 422;
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = 'UnprocessableEntityError';
    this.issues = issues;
  }
}
