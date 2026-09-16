# Confidentiality and Content Safety

The Learning Experience Engine repository is a public development project.

Only reusable code, generic examples, fictional content, approved public information, and sanitized portfolio-safe material may be committed to this repository.

## Never Commit

Do not commit:

- Confidential company information
- Internal Ericsson documentation
- Customer-confidential information
- Unapproved customer names
- Internal URLs
- Employee information
- Internal screenshots
- Private presentations or PDFs
- Source course exports containing confidential information
- Authentication credentials
- API keys
- Passwords or tokens
- Private assessment banks
- Proprietary assets unless specifically approved for public use

## Private Content Workspace

Confidential learning materials should be stored outside this repository in the sibling local folder:

`learning-content-private/`

The Learning Experience Engine may read from that local workspace during development, but confidential files must not be copied into this public repository.

## Publishing Rule

Before content is committed or published, treat it as public information.

If there is uncertainty about whether something is safe for public publication, do not commit it.

## Repository Safety Model

The project uses multiple safeguards:

- Confidential source material stays outside the public repository
- `.gitignore` blocks common private paths and sensitive file types
- Public demo content should be fictional, public, or explicitly sanitized
- Future validation scripts will scan public builds before publication
- Future pre-commit checks will help prevent accidental exposure

`.gitignore` is a guardrail, not a substitute for keeping confidential source material outside the repository.
