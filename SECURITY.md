# Security Policy

CodeGenome handles source archives as untrusted input. Please report suspected path traversal, archive-bomb, arbitrary file write, data-retention, authentication, or secret-exposure issues privately rather than publishing an exploit first.

The ZIP web flow uses in-memory upload handling, rejects unsafe entry paths, bounds entry count and expanded size, confines extraction to a temporary directory, and removes the directory after processing. Do not upload credentials, production secrets, private keys, or personal data to a public instance.

When reporting an issue, include the affected endpoint or file, a minimal reproduction that contains no confidential source, the observed impact, and a suggested mitigation if available. Do not include live credentials or private repository contents.

The project and this policy are distributed under the **Apache License 2.0**, SPDX identifier **Apache-2.0**. See [`LICENSE`](LICENSE).
