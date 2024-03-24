import { useEffect, useState } from 'react';
import membersIcon from '../../../../assets/images/members.svg';
import axios from 'axios';

import './Teams.style.scss';

const getTeams = async ({ owner, token }) => {
  try {
    const teams = [];

    if (owner && token) {
      let nextPageUrl = `https://api.github.com/orgs/${owner}/teams?per_page=100&page=1`;
      while (nextPageUrl) {
        const response = await axios.get(nextPageUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        nextPageUrl = response.headers.link
          ?.split(', ')
          .find(url => url.includes('next'))
          ?.split('; ')[0]
          .replace('<', '')
          .replace('>', '');

        teams.push(...response.data.map(({ id, name, html_url, avatar_url }) => ({
          id,
          name,
          html_url,
          avatar_url: `https://avatars.githubusercontent.com/t/${id}`,
          numberOfMembers: 10,
        })));
      }
    }

    return teams;
  } catch (error) {
    console.error('Error fetching teams:', error.message);
    return 403;
  }
};

const Teams = ({
  auth
}) => {
  const [list, setList] = useState([]);
  const [forbidden, setForbiddenError] = useState(false);

  useEffect(() => {
    (async () => {
      const teams = await getTeams(auth);
      if(Array.isArray(teams)) {
        setForbiddenError(false);
        setList(teams);
      } else {
        setForbiddenError(true);
      }
    })();
  }, [auth]);

  return (
    <div className="teams">
      <h3 className='section-title'>Teams</h3>
      {
        forbidden
          ? <div className='forbidden'>You don't have access to this section</div>
          : <div className='team-list'>
            {list.map(({ id, avatar_url, name, html_url, numberOfMembers }) =>
              <div className="team-item" key={id}>
                <div className='team-title'>
                  <img src={avatar_url} className='team-avatar' alt='' />
                  <a
                    href={html_url}
                    className="team-link"
                    target="_blank"
                    rel="noreferrer"
                  >{name}</a>
                </div>
                <div className='team-member-count'>
                  <img src={membersIcon} className='team-member-icon' alt='' />
                  <div className='team-member-number'>{numberOfMembers}</div>
                </div>
              </div>
            )}
          </div>
      }
    </div>
  );
};

export default Teams;
