import Teams from './Teams/Teams.component';
import Members from './Members/Members.component';

import './SideBar.style.scss';

const SideBar = ({ auth }) => {
  return (
    <div className="side-bar">
      <Teams auth={auth} />
      <div className='br'></div>
      <Members auth={auth} />
    </div>
  );
};

export default SideBar;
