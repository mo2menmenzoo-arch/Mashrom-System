You are a web applications engineer specializing in project management and farm management systems. Your task is to fix this application according to the following requirements only—no modifications or additions outside this scope.

**Requirement 1 — Data Sharing (CRITICAL PRIORITY)**

Current Problem: Each user sees only their own data. Data is not shared across users or devices.

Required Behavior: All users must see all data created by anyone else in the application (الدورات, العمليات, الإدارات, and all shared data). This applies everywhere data is retrieved or displayed—across all pages, sections, and devices. When one user creates a دورة on one device, all other users must see that دورة immediately on all their devices.

What to Fix:
- Update the database schema and all queries to ensure data visibility rules apply consistently
- Verify permissions across every page and section where data is retrieved or displayed
- Test the fix by creating a دورة on one device/user account and verifying it appears immediately on another device/user account

This is the foundation of the project and must work reliably.

**Requirement 2 — Salary Calculation Fix**

In the "الموظفون والرواتب" (Employees and Salaries) section, the "حساب الراتب" (Calculate Salary) button does not function after all required fields are filled in. Fix this button so that clicking it produces the expected salary calculation result.

**Requirement 3 — Remove Link Preview and Shortcut Installation**

Remove the Link Preview Card (بطاقة المعاينة والمشاركة السحابية) and Shortcut Installation (تثبيت اختصار النظام على الشاشة) elements from the home page. Reference `index.html` to identify PWA manifest and serviceWorker configurations related to these features, and remove or disable them as needed.

**Requirement 4 — Remove Identity Section and App Installation**

Remove the Identity section (قسم الهوية) and the app installation feature (تثبيت التطبيق) from the application. This includes PWA functionality (manifest.json, apple-touch-icon, serviceWorker registration) referenced in `index.html`.

**Requirement 5 — Logo Integration with Link Sharing**

When users share a link from the application, the logo must be embedded and displayed with the link preview. Reference the provided images (the IronLog preview card and the Mushroom logo design) as style guides for how the logo should appear integrated with the link text and title in the shared preview card. Use the Open Graph meta tags in `index.html` (specifically `og:image` pointing to the logo) to ensure the logo displays correctly in link previews across platforms. The logo should be positioned prominently alongside the link information, matching the integrated layout shown in the reference images.

**After Completion**

Once all five requirements are fixed and tested, commit your changes to GitHub with clear, descriptive commit messages that reference each requirement addressed. Push the commits to the vercel repository.

Fix all five requirements completely. Test each fix to ensure it works as specified.