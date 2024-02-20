import membersIcon from '../../../../assets/images/members.svg';

import './Teams.style.scss';

const Teams = ({
  list
}) => {
  return (
    <div className="teams">
      <h3 className='section-title'>Teams</h3>
      <div className='team-list'>
        {list.map(({ id, avatar_url, name, html_url, numberOfMembers }) =>
          <div className="team-item" key={id}>
            <div className='team-title'>
              <img src={avatar_url} className='team-avatar' />
              <a
                href={html_url}
                className="team-link"
                target="_blank"
                rel="noreferrer"
              >{name}</a>
            </div>
            <div className='team-member-count'>
              <img src={membersIcon} className='team-member-icon'/>
              <div className='team-member-number'>{numberOfMembers}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Teams;
