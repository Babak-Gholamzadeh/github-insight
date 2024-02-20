import Teams from './Teams/Teams.component';
import Members from './Members/Members.component';

import './SideBar.style.scss';

const SideBar = () => {
  const teamList = [
    {
      html_url: '',
      id: 0,
      name: '',
      avatar_url: '',
      numberOfMembers: 0,
    },
  ];
  
  const memberList = [
    {
      html_url: '',
      avatar_url: '',
      id: 0,
      login: ''
    },
  ];

  return (
    <div className="side-bar">
      <Teams list={teamList}/>
      <div className='br'></div>
      <Members list={memberList} />
    </div>
  );
};

export default SideBar;
