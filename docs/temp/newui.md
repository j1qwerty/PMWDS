# TODO - new ui
- COMPELTE ALL REQUIRED PAGES 
- DO NOT STOP FOR ANYTHING FIGURE IT OUT AND UPDATE
- STOP ONLY ONCW EVERYTHING IS IMPLEMENTED AND VERIFIED
- MAKE NECCESSARY IMPROVEMENTS

## NOTE
- wireframes-projects.html use this for reference and make a new ui in the new folder
- use client folder which contains react app as reference to understand the roles, and logic behind everything

## goals
- create new git branch newui and switch to it before starting
- create a todo list to implement everything
- make commit every step of the proecess

## ui
- structure - src contains shared and pages folders, each page has pagename.tsx and components folder which contains that page specific components only
- NOTE- for each element understand the role structure and implement properly
- make it modular, use shared componets, create one element and use it in multiple pages
- add option to assign colors as shown in wireframes-projects.html 
- in settings also include the section related to ui  as given in wireframes-projects.html
- on click elements expand and show more details while keeping everything compact
-  on clicking milestone expand it show more details, on clicking any task inside the milestone expand to show more details, user can update tasks progress, umake comment (show comments while expnaded with user profile who commmented, same for any subtaks when user clicks expand it to show details, can commment and update )
- view icon button to show details in modal

### dashboard
- add cards for organisations , departments, projects also
- add buttons to add organization , department and projects just like the buttons for milestones and tasks and subtasks (order - organisaton, department , project , milestone, tasks, subtasks)
- dorpdown filters for everthing like organisation , department , projects, milestones, tasks ( with All selected as by default and depending on the role shows the data for the organisation or department or project, whenever user changes any dropdown the list of options in all other dropdowns chage respectively, use react app in client folder to understand roles and filters)
- filter for status like not started, delayed, inprogress etc
- search button to search proejcts, tasks milestones etc
- sort button to sort by name, time, etc

### kanban style board aslo like in wireframes-projects.html
- but aslo include all filters for organisation and department and proejct depending on the role what to show and what to hide 
