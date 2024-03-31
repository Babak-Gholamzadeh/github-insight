

---------------------

Repository table:
+ add a loading to the repository table

Canvas:
- Show the keyboard shortcuts somewhere on each canvas
- Hold ctrl, then the mouse becomes pointer and when clicking on a PR on charts, to opens the page for that PR
- Fix the track scaling on the bar chart to stick to the mouse position
- Make the chart canvas to be full screen
- Make the inititial zooming on both charts to fit all the avaliable data both vertically and horizantolly
- Make sure notification on chart never goes out of the view
- Make sure the cursor time box never goes out of the view in gantt chart
- Add zoom reset on charts
- Add position reset on charts
- Fix the hover color effect on PRs

General:
- Handle error with expirad token
- Clean up after changing the auth
- and show 'there is no team/member' for 404 error.
- It's also nice to give the user the ability to collapse the auth section, but only if it's already authorized.
- make web page responsive

// Full screen
function toggleFullScreen() {
  const element = document.getElementById('gb');
  if (!document.fullscreenElement) {
const requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullScreen;
//     document.documentElement.requestFullscreen();
    requestMethod.call(element);
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key === "f") {
      toggleFullScreen();
    }
  },
  false,
);
