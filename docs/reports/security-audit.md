# Security, Accessibility & API Audit

## Project: PMWDS - Client Application
**Date:** July 3, 2026
**Tech Stack:** React 19.2.5, TypeScript, Vite 8.0.9, Tailwind CSS 4.2.4, React Router DOM v7.14.1
**Repo Root:** E:\saturday\PMWDS.S\Client

---

# Critical Issues

## C-1: JWT Auth Token Stored in localStorage (Persistent XSS Vector)

| Attribute | Detail |
|-----------|--------|
| **File** | src/auth.tsx:55-65 |
| **Severity** | **Critical** |
| **CWE** | CWE-312: Cleartext Storage of Sensitive Information |
| **Risk** | Any XSS vulnerability grants attacker permanent access to JWT |

**Description:** The entire AuthState (including JWT token, expiry, userId, email, roles, permissions) is serialized to localStorage under key pmwds-client-auth. On page load (line 55), state is rehydrated from localStorage. Tokens survive tab/browser close and are accessible from any JavaScript in the same origin.

**Recommendation:** 1) Migrate to httpOnly Secure SameSite cookies, 2) At minimum use sessionStorage and keep only a short-lived token, keeping full user data in memory, 3) Add token fingerprinting binding tokens to browser properties.

## C-2: No Request AbortController/Cancellation on Unmount

| Attribute | Detail |
|-----------|--------|
| **File** | src/api.ts:76-129 (entire request() function) |
| **Severity** | **Critical** |
| **CWE** | CWE-404: Improper Resource Shutdown |
| **Risk** | Memory leaks, stale state updates, race conditions |

**Description:** The api.ts request() function uses bare fetch() with no AbortController signal. No component in the codebase passes an abort signal. When a component unmounts before an API call completes, setState on unmounted components causes React warnings, race conditions where old responses overwrite new data, and memory leaks from in-flight requests.

**Recommendation:** Accept optional AbortSignal in the API client and use it in fetch calls. In components, create an AbortController in useEffect and abort on cleanup.

## C-3: Hardcoded OpenRouter API Key in .env.example

| Attribute | Detail |
|-----------|--------|
| **File** | .env.example:34 |
| **Severity** | **Critical** |
| **CWE** | CWE-798: Use of Hard-coded Credentials |
| **Risk** | Publicly exposed API key allows unauthorized usage |

**Description:** An OpenRouter API key is hardcoded in the example environment file and committed to the git repository. The key should be rotated immediately.

**Recommendation:** 1) Rotate the exposed key immediately via OpenRouter dashboard, 2) Remove the actual key value from .env.example, 3) Verify .env is in .gitignore.

## C-4: dangerouslySetInnerHTML Used for SVG Injection

| Attribute | Detail |
|-----------|--------|
| **File** | src/pages/shared/bg/BgRenderer.tsx:41-43 |
| **Severity** | **Critical** |
| **CWE** | CWE-79: Improper Neutralization of Input During Web Page Generation |
| **Risk** | Direct XSS vector if config parameters become user-modifiable |

**Description:** Uses dangerouslySetInnerHTML to inject SVG markup via buildWavesSvg(). This defeats React's XSS protection. While current config values appear controlled, this pattern is dangerous and could become a vector if config data is ever user-modifiable.

**Recommendation:** Replace with a proper React SVG component that generates paths programmatically.

## C-5: No Content Security Policy (CSP) Configured

| Attribute | Detail |
|-----------|--------|
| **File** | index.html:1-18, vite.config.ts:1-8 |
| **Severity** | **Critical** |
| **CWE** | CWE-1021: Improper Restriction of Rendered UI Layers |
| **Risk** | No XSS mitigation; no clickjacking protection; CDN resources lack integrity checks |

**Description:** No CSP meta tag or HTTP header is configured. External fonts are loaded from fonts.googleapis.com without subresource integrity. The application has no frame-ancestors protection against clickjacking.

**Recommendation:** Add a strict CSP via meta tag or HTTP header.

## C-6: No CSRF Protection for API Endpoints

| Attribute | Detail |
|-----------|--------|
| **File** | src/api.ts:137-163 (login, signup, forgotPassword, resetPassword, refresh) |
| **Severity** | **Critical** |
| **CWE** | CWE-352: Cross-Site Request Forgery |
| **Risk** | If auth switches to cookies, all endpoints become CSRF-vulnerable |

**Description:** The request() function sends no anti-CSRF token. While Bearer-token auth partially mitigates this, there is no defense-in-depth if the backend ever transitions to cookie-based auth.

**Recommendation:** Add X-CSRF-Token header validation and ensure backend validates Origin/Referer headers. Use SameSite=Strict for any authentication cookies.

# High Severity Issues

## H-1: Auth State Exposes Full User Data in localStorage

| Attribute | Detail |
|-----------|--------|
| **File** | src/auth.tsx:40-51, 55-65 |
| **Severity** | **High** |
| **CWE** | CWE-200: Information Exposure |
| **Risk** | PII (fullName, email, roles) stored in cleartext browser storage |

**Description:** Full user profile data including fullName, email, roles, permissions, and userId are persisted to localStorage. This is personal information that should not be stored in cleartext accessible to JavaScript.

**Recommendation:** Store only essential, non-sensitive data in localStorage. Keep the full user profile in React state only.

## H-2: Client-Side Only Permission Checks (IDOR Risk)

| Attribute | Detail |
|-----------|--------|
| **File** | src/App.tsx:48-61, src/pages/shared/PermissionControls.tsx:48-67 |
| **Severity** | **High** |
| **CWE** | CWE-639: Authorization Bypass Through User-Controlled Key |
| **Risk** | Users can access any resource ID if backend does not revalidate |

**Description:** Route guards in ROUTE_GUARDS only provide client-side UI hiding. The API calls pass the user token but don t validate resource-level permissions client-side. Users can manually construct URLs to access resources if the backend doesn't enforce access control.

**Recommendation:** This must be fixed server-side. Ensure the backend validates resource-level access for every API request.

## H-3: API Key Exposure in Frontend AI Settings

| Attribute | Detail |
|-----------|--------|
| **File** | src/pages/settings/AISettings.tsx:396-416 |
| **Severity** | **High** |
| **CWE** | CWE-522: Insufficiently Protected Credentials |
| **Risk** | AI provider API keys sent to frontend; visible in DevTools memory |

**Description:** The AI settings page receives and renders provider API keys in React state. While masked as password inputs, keys exist in browser memory and could be extracted via memory dump, browser extensions, or XSS.

**Recommendation:** Never send full API keys to frontend. Send only a hasKey: boolean indicator. Proxy all AI API calls through the backend.

## H-4: Missing Focus Trap in Modal Overlays

| Attribute | Detail |
|-----------|--------|
| **File** | src/pages/shared/ModalOverlay.tsx:12-50, ProfilePictureUploader.tsx:138-273 |
| **Severity** | **High** |
| **CWE** | WCAG 2.1.2 (No Keyboard Trap) |
| **Risk** | Keyboard users can tab outside modal; screen reader users interact with background |

**Description:** Neither ModalOverlay nor the ProfilePictureUploader editor modal implement focus trapping. No initial focus is set when modal opens. Escape key handling is missing in most implementations.

**Recommendation:** Implement a useFocusTrap hook that traps Tab cycling, sets initial focus on open, and closes on Escape.

## H-5: Missing aria-labels on Icon-Only Buttons

| Attribute | Detail |
|-----------|--------|
| **Files** | Multiple components |
| **Severity** | **High** |
| **CWE** | WCAG 4.1.2 (Name, Role, Value) |
| **Risk** | Screen reader users cannot identify interactive controls |

**Description:** Icon-only buttons throughout the codebase lack aria-label:
- src/pages/shared/modals/TaskEditModal.tsx:181,193 (escalate, delete)
- src/layout.tsx:298-310 (sidebar toggle)
- src/pages/login/login.tsx:387-395 (show/hide password)
- src/pages/shared/ProfilePictureUploader.tsx:156-163 (close)
- src/pages/shared/modals/SubtaskEditModal.tsx:101 (delete)

**Recommendation:** Add aria-label to all icon-only buttons.

## H-6: Form Inputs Not Associated with Labels

| Attribute | Detail |
|-----------|--------|
| **Files** | 30+ form components across the codebase |
| **Severity** | **High** |
| **CWE** | WCAG 1.3.1, 4.1.2 |
| **Risk** | Screen readers cannot associate labels; click targets are small |

**Description:** Throughout the codebase, label elements lack htmlFor attributes and input/select/textarea elements lack matching id attributes. Many labels are styled span containers that provide no programmatic association. Affected files include login.tsx, TemplateFormModal.tsx, ActivityForm.tsx, RegisterUserForm.tsx, ProgressStatusEditor.tsx, AISettings.tsx, and many more.

**Recommendation:** Add matching htmlFor on label and id on input for every form field.

## H-7: Native confirm() Used for Destructive Actions

| Attribute | Detail |
|-----------|--------|
| **Files** | TaskEditModal.tsx:93, SubtaskEditModal.tsx:34, ProgressStatusEditor.tsx:70 |
| **Severity** | **High** |
| **CWE** | CWE-451: UI Redressing / WCAG 2.1.1 |
| **Risk** | Not customizable; not accessible; shows raw URLs |

**Description:** Native confirm() dialogs are used for delete confirmations and status change warnings. These are not accessible to screen readers, cannot include contextual warnings, and show the raw URL to users.

**Recommendation:** Replace with the existing DeleteConfirmationModal component that provides styled, accessible confirmation dialogs.

## H-8: File Upload Missing Size Validation

| Attribute | Detail |
|-----------|--------|
| **File** | src/pages/shared/ProfilePictureUploader.tsx:44-61 |
| **Severity** | **High** |
| **CWE** | CWE-434: Unrestricted Upload of File with Dangerous Type |
| **Risk** | Large files could crash browser tab; memory exhaustion |

**Description:** The file upload only checks MIME type (file.type.startsWith('image/')). There is no file size limit or image dimension validation before client-side processing.

**Recommendation:** Add file size check (e.g. 5MB limit) and validate dimensions before allowing cropping.

# Medium Severity Issues

## M-1: No Retry Logic for Failed API Requests

| Attribute | Detail |
|-----------|--------|
| **File** | src/api.ts:109-117 |
| **Severity** | **Medium** |
| **CWE** | CWE-821: Incorrect Synchronization |
| **Risk** | Transient network failures cause user-facing errors unnecessarily |

**Recommendation:** Implement exponential backoff retry for 429 (rate limit) and 5xx (server error) responses.

## M-2: Static Demo Credentials Hardcoded in Source

| Attribute | Detail |
|-----------|--------|
| **File** | src/pages/login/login.tsx:68-69 |
| **Severity** | **Medium** |
| **CWE** | CWE-798: Use of Hard-coded Credentials |
| **Risk** | Default credentials visible to anyone with source code access |

**Description:** Login page defaults: useState('admin@org1.com') and useState('Pmwds@123'). Demo accounts with admin-level access are displayed in the UI.

**Recommendation:** Remove default credentials; load demo accounts from environment variables or backend config.

## M-3: Google Fonts CDN Missing Subresource Integrity

| Attribute | Detail |
|-----------|--------|
| **File** | index.html:8 |
| **Severity** | **Medium** |
| **CWE** | CWE-829: Inclusion from Untrusted Control Sphere |
| **Risk** | Third-party can modify loaded CSS; user tracking |

**Recommendation:** Add crossorigin='anonymous' attribute. Consider self-hosting fonts in production.

## M-4: Missing referrerpolicy on External Avatar Service

| Attribute | Detail |
|-----------|--------|
| **File** | src/pages/shared/Avatar.tsx:57, Avatark.tsx:58 |
| **Severity** | **Medium** |
| **CWE** | CWE-200: Information Exposure |
| **Risk** | User full names leaked to third-party service |

**Description:** The fallback avatar URL https://ui-avatars.com/api/ sends user names to an external service via URL parameters and Referer header.

**Recommendation:** Generate avatars locally or add referrerpolicy='no-referrer' to img tags.

## M-5: Heading Hierarchy Violations

| Attribute | Detail |
|-----------|--------|
| **Files** | Multiple pages |
| **Severity** | **Medium** |
| **CWE** | WCAG 1.3.1, 2.4.10 |
| **Risk** | Screen reader users cannot navigate page structure logically |

**Examples:**
- src/pages/ai/ai.tsx: h4 (241) -> h5 (283) skipping h2/h3
- src/pages/login/login.tsx: h2 (225) appears before h1 (595) in DOM order
- src/pages/skills/SkillsPage.tsx: h3 (447) -> h5 (833) skipping h4

**Recommendation:** Ensure sequential heading hierarchy starting with h1 on every page.

## M-6: Missing Loading States for API Calls

| Attribute | Detail |
|-----------|--------|
| **Files** | Various components |
| **Severity** | **Medium** |
| **Risk** | Users may think the app is unresponsive |

**Recommendation:** Add explicit loading states in components that fetch data. Use the existing LoadingPage and Skeleton components.

## M-7: Keyboard Navigation Issues in Custom Dropdown

| Attribute | Detail |
|-----------|--------|
| **File** | src/pages/projectsK/components/ProjectBasicDetails.tsx:156-209 |
| **Severity** | **Medium** |
| **CWE** | WCAG 2.1.1, 2.4.3 |
| **Risk** | Keyboard-dependent users cannot change project status |

**Description:** The custom status dropdown uses role=listbox/option but doesn't handle arrow keys for option navigation or Escape to close.

**Recommendation:** Implement full ARIA combobox pattern with keyboard event handlers for ArrowUp, ArrowDown, Enter, and Escape.

## M-8: Server Error Messages Leaked to Users

| Attribute | Detail |
|-----------|--------|
| **File** | src/api.ts:109-117 |
| **Severity** | **Medium** |
| **CWE** | CWE-209: Information Exposure Through an Error Message |
| **Risk** | Sensitive backend details exposed in client-side errors |

**Description:** Raw backend error messages are passed directly to the frontend and displayed to users.

**Recommendation:** Sanitize error messages in production. Log full details server-side and show generic messages to users.

# Low Severity Issues

## L-1: Hardcoded API Fallback URL
| **File** | **Line** | **Issue** |
|----------|----------|----------|
| src/api.ts | 55-57 | http://localhost:5177 hardcoded as fallback; could accidentally connect to wrong server in production |

## L-2: No Path Traversal Sanitization
| **File** | **Line** | **Issue** |
|----------|----------|----------|
| src/api.ts | 77 | Path segments not sanitized for ../ traversal sequences in user-controlled paths |

## L-3: Duplicate Avatar Components
| **Files** | **Issue** |
|----------|----------|
| Avatar.tsx, Avatark.tsx | Nearly identical code duplicated with different import references |

## L-4: Inline style Tags Violate Strict CSP
| **File** | **Line** | **Issue** |
|----------|----------|----------|
| BgRenderer.tsx | 75 | Inline style tag for animation keyframes |
| ProfilePictureUploader.tsx | 265-270 | Inline style tag for modal animation |

## L-5: Non-Semantic HTML Structure
| **Issue** | **Details** |
|-----------|-------------|
| Task cards | Uses div[role='button'] instead of native button element |
| Sidebar | Uses div instead of nav semantic element |
| Main content | Uses div instead of main semantic element |

## L-6: Missing role='alert' on Dynamic Messages
| **Risk** | Screen reader users may miss error/success notifications that appear dynamically |

## L-7: Undefined CSS Variables Referenced
| **File** | **Line** | **Issue** |
|----------|----------|----------|
| src/index.css | 348, 358 | var(--success-bg) and var(--warning-bg) referenced but not defined in @theme |

---

# Summary

| Severity | Count |
|----------|-------|
| **Critical** | 6 |
| **High** | 8 |
| **Medium** | 8 |
| **Low** | 7 |
| **Total** | **29** |

---

# Priority Action Items

## Immediate (Critical)
- [ ] **C-1** Migrate JWT from localStorage to httpOnly cookies or memory-only storage
- [ ] **C-2** Implement AbortController for all API requests to prevent race conditions
- [ ] **C-3** Rotate exposed OpenRouter API key; remove from .env.example
- [ ] **C-4** Replace dangerouslySetInnerHTML with React SVG component
- [ ] **C-5** Add Content Security Policy headers/meta tag
- [ ] **C-6** Implement CSRF protection for auth endpoints

## Short-term (High)
- [ ] **H-1** Minimize sensitive data stored in localStorage
- [ ] **H-2** Ensure backend enforces resource-level authorization (not just client-side)
- [ ] **H-3** Remove API key exposure from frontend; proxy through backend
- [ ] **H-4** Implement focus trapping in all modal overlays
- [ ] **H-5** Add aria-label to all icon-only buttons across the app
- [ ] **H-6** Fix form label associations (add htmlFor/id pairs)
- [ ] **H-7** Replace native confirm() with custom accessible modal component
- [ ] **H-8** Add file size and dimension validation for uploads

## Medium-term
- [ ] **M-1** Add retry logic with exponential backoff to API client
- [ ] **M-2** Remove hardcoded credentials from login page
- [ ] **M-3** Add integrity and crossorigin attributes to CDN resources
- [ ] **M-4** Add referrerpolicy='no-referrer' to external avatar images
- [ ] **M-5** Fix heading hierarchy violations across all pages
- [ ] **M-6** Add loading states to components missing them
- [ ] **M-7** Add keyboard navigation support to custom dropdown controls
- [ ] **M-8** Sanitize server error messages before showing to users

---

> **Note:** This audit was performed on the frontend codebase only. A comprehensive security assessment should also include a backend audit checking authorization enforcement, SQL injection prevention, rate limiting, audit logging, and JWT validation.
