+ First when a user comes to the page, the only thing they see is the authorization part and nothing else, then they have all the information about what they need to input and an authrozie button. After clicking on the button, if there is gonna be any error, display it on this section (i.e. invalid token or not found owner, etc). but if everything looks fine then change the button to 'authorized' or something else and disable it to prevent the user to click on it again until they change the inputs and also save the inputs in the local storage. Also good to have a checkbox in this part (defualt checked) to save the inputs in local storage for the next use (and something to clear the local storage?). After everthing is done here, scroll the user down to the repository table.

- It's also nice to give the user the ability to collapse the auth section, but only if it's already authorized.

- For the teams and members part show the list of them, or 'do not have access error for 403 error and show 'there is no team/member' for 404 error.

- In the repository table, give the user the ability to select multiple repos and added to a list that is stuck to the bottom of the screen and the user should be able to add/remove repo from the table and remove/disable/enable repo from the list just by one click.

- Maybe the ability to search a repo for its name?

- Prevent the user to select repos with 0 PRs. It's pointless.

- Show the sum of the total PRs for the selected and enabled repos in the list somewhere.

- By default it gets at most total of 1000 or total availible PRs from all the selected repos, but give the user the ability to change it

- Show an slider for the min of 1 to the max of total availible

- There should also be a way to limit the numbers based on a time period (i.e. the PRs for the last month)

- There should be a button in that list to 'start fetching the data' and after clicking on that, changing on the list should be disabled and the button gets changed to 'stop the fetching of the data' and after clicking on this one, should keep the fecthed data and display it and also let the user to manipulate the list but still shows the progess bar of the fetched data. (Or it should be 'pause' and 'stop'?)

- Hold ctrl, then the mouse becomes pointer and when clicking on a PR on charts, to opens the page for that PR

- Show the timeline time section color for the bar chart

- Fix the track scaling on the bar chart to stick to the mouse position

- Make the chart cavas to be full screen

- Show the keyboard shortcuts somewhere on each canvas

- Make the inititial zooming on both charts to fit all the avaliable data both vertically and horizantolly

