import Repositories from './Repositories/Repositories.component';
import SideBar from './SideBar/SideBar.component';

import './OverviewSection.style.scss';

const OverviewSection = ({ auth, selectedRepos, addRepo, removeRepo }) => {
  const { owner, ownerType, token } = auth;
  if (!owner || !ownerType || !token) return;

  return (
    <div className='overview-section'>
      <Repositories
        auth={auth}
        selectedRepos={selectedRepos}
        addRepo={addRepo}
        removeRepo={removeRepo}
      />
      {auth.ownerType === 'organization' ? <SideBar auth={auth} /> : null}
    </div>
  );
};

export default OverviewSection;
