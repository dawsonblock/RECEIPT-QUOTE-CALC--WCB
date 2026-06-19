import type { ValidationIssue } from "@wcb/shared";

interface ValidationWarningsProps {
  issues: ValidationIssue[];
}

export function ValidationWarnings({ issues }: ValidationWarningsProps) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="validation-box">
      <h3>Review before export</h3>
      <ul>
        {issues.map((issue) => (
          <li key={`${issue.code}-${issue.receiptId ?? ""}`} className={issue.level}>
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
