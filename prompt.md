1- Scan the workspace and migrate our local data storage to Firebase Firestore. Use your Firebase MCP tools for optimal setup and control. Implement real-time snapshot listeners so data is instantly shared across all users. Update the relevant files directly.

2- Scan the workspace for routing, navigation, and the Lock Screen login logic.
Problem: Critical security vulnerability. When the app is restarted, it bypasses the Lock Screen (Admin/Operator/Supervisor) and directly restores the last visited protected route.
Goal: Implement a strict Route Guard or App Initialization check. On every single app launch or initialization, the app MUST force redirect to the Lock Screen. Protected routes must be completely inaccessible unless the specific role password has been successfully verified in the current session. Update the relevant files directly.

3- Fix the WhatsApp link preview image bug for https://mushroom-system-app.vercel.app/. Locate the file containing the <head> tag and find the main logo image in the repository. Add/update these precise Open Graph tags inside <head>. CRITICAL: The og:image MUST use an absolute URL starting with https://mushroom-system-app.vercel.app/ (no relative paths):

- og:title: "Mushroom System | نظام مزارع الفطر"
- og:url: "https://mushroom-system-app.vercel.app/"
- og:type: "website"
- og:image: [Full absolute URL of the located logo file]
Apply the modification directly to the file.