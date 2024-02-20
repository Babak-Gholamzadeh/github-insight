import Repositories from './Repositories/Repositories.component';
import SideBar from './SideBar/SideBar.component';

import './OverviewSection.style.scss';

const OverviewSection = ({auth}) => {

  return (
    <div className='overview-section'>
      <Repositories auth={auth} />
      <SideBar auth={auth} />
    </div>
  );
};

export default OverviewSection;
