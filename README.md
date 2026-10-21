<div align="center">

DAYMARK
From intention to execution.
A personal execution workspace for turning ideas into projects, projects into tasks, and tasks into finished work.

Plan with clarity. Make progress visible. Build a record of what you've actually done.
</div>

Overview
Daymark is a local-first productivity application built around one simple belief: execution is the basis of progress.

Ideas are easy to collect. Keeping track of multiple projects, knowing what deserves attention today, and consistently finishing what you start is harder. Daymark brings those pieces together in one focused workspace.

It is designed for independent builders, freelancers, creators, students, and anyone juggling meaningful work across multiple projects. Instead of becoming another place to endlessly organize plans, Daymark aims to make the next action clear and the outcome visible.
Less planning. More finished work.

Features
Project workspace
- Create and manage projects in one place.
- Organize projects by category, priority, status, and deadline.
- Follow progress from planned work through completion.
- Keep the work and context of each project together.
Structured tasks
- Break projects into tasks and nested subtasks.
- Mark work complete as you go.
- Track completion and see progress update across the workspace.
- Keep planned work and deadlines distinct.
My Day
- A daily view built around what needs your attention.
- Surface scheduled work and overdue tasks.
- Move between the bigger project picture and today's next actions.
Progress and reflection
- Dashboard views for active work and completion progress.
- Analytics to help make execution measurable.
- A Finished Work Journal for recording outcomes, lessons, and completed projects.
Local-first workspace
- Workspace data is stored locally in the browser.
- JSON backup and restore for portability.
- No account is required for the local-first experience.
Interactive visual identity
- A minimal, dark-first interface with deliberate typography and restrained motion.
- A WebGL audio-reactive orb with animated wobble effects, built as the visual foundation for a future Daymark assistant.
Current voice status: The orb and its visual effects are present; spoken responses, speech recognition, custom TTS voices, and conversational assistant features are not implemented yet.
Screenshots
Add screenshots or a short demo GIF here.
<!-- Example:
![Daymark overview](./public/screenshots/overview.png)
![Daymark projects](./public/screenshots/projects.png)
-->

Built With
Daymark is a React application using a modern frontend stack:
Area	Technology
Application	React + Vite
Styling	Tailwind CSS
UI	shadcn/ui and Kokonut UI
State	Zustand
Animation	GSAP
Icons	Lucide React
Audio-reactive visual	WebGL, GLSL, and Web Audio API
Persistence	Browser LocalStorage with JSON backup/restore


The table describes the project stack and visual foundation; it does not imply that voice synthesis is currently available.
Getting Started
Prerequisites
- Node.js and npm
- A modern browser
Installation
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
npm install
npm run dev
Open the local URL shown by Vite in your terminal.

To create a production build:
npm run build
To preview the build locally:
npm run preview
Replace the repository placeholders with the actual GitHub URL and folder name before publishing.
How Daymark Works
1. Define the project. Give the work a name, outcome, and deadline.
2. Break it down. Turn a large goal into manageable tasks and subtasks.
3. See today's work. Use the daily view to find the next important action.
4. Execute. Complete tasks and watch progress move.
5. Reflect. Record finished work, not just plans.
The goal is not to maximize the number of tasks you create. It is to make meaningful work easier to finish.
Product Direction
Daymark is being developed as an execution-first product. The roadmap below describes ideas and planned capabilities, not features already available in the current release.
Near-term improvements
- [ ] Refine the Daymark assistant's visual states: idle, listening, and speaking.
- [ ] Add browser-based text-to-speech.
- [ ] Synchronize the visual orb with generated audio where supported.
- [ ] Expand accessibility, keyboard workflows, and usability polish.
- [ ] Explore optional accounts and secure cross-device synchronization.
Future: Daymark Assistant
- [ ] Custom neural TTS voice and selectable voice profiles.
- [ ] Speech recognition and conversational task interactions.
- [ ] Spoken morning briefings and end-of-day reviews.
- [ ] Context-aware suggestions based on projects, priorities, and deadlines.
- [ ] Natural-language task creation and rescheduling.
Future: Proactive execution
- [ ] Configurable reminders and smart deadline notifications.
- [ ] Optional SMS and WhatsApp notifications through approved integrations.
- [ ] Two-way messaging to review, reschedule, or complete tasks.
- [ ] Weekly execution summaries.
- [ ] Thoughtful notification controls to avoid unnecessary interruptions.
These ideas will be evaluated based on real user needs. Daymark's purpose is to reduce the work of managing work—not to create more noise.
Data and Privacy
The current local-first model keeps workspace data in browser storage. Users should export backups regularly: clearing browser data or changing devices can result in data loss if a backup has not been retained.

Cloud sync, accounts, and messaging integrations are future considerations and would require separate privacy and security controls.
Contributing and Feedback
Daymark is an evolving project. Bug reports, usability feedback, and thoughtful feature suggestions are welcome through GitHub Issues, if enabled for this repository.

When proposing a feature, consider one question:

Does it help someone move from intention to execution?
Project Status
Active development. The core productivity workspace has been built, and the animated assistant interface currently provides visual wobble/reactive effects only. Voice synthesis and proactive messaging belong to the roadmap.
License
Add your chosen license here before publishing. Until a license is specified, do not assume the repository is open-source or grants reuse rights.
<div align="center">

DAYMARK

From intention to execution.

Built with the belief that progress is measured by what gets finished.
</div>
