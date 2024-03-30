import { useEffect, useState } from 'react';
import membersIcon from '../../../../assets/images/members.svg';
import axios from 'axios';
import { log } from '../../../../utils';

import './Teams.style.scss';

let globalFetchDataExecutionId = 0;
let teams = [];

const getTeams = async (
  { owner, token },
  setFecthedRecords,
  setForbiddenError,
) => {
  const localFetchDataExecutionId = globalFetchDataExecutionId = Math.floor(Math.random() * 100);
  teams = [];

  if (!owner || !token) return;

  try {
    let nextPageUrl = `https://api.github.com/orgs/${owner}/teams?per_page=100&page=1`;
    while (nextPageUrl) {
      const response = await axios.get(nextPageUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Check if a new loading operation is on going
      if (localFetchDataExecutionId !== globalFetchDataExecutionId) {
        log({ localFetchDataExecutionId, globalFetchDataExecutionId });
        return;
      }

      nextPageUrl = response.headers.link
        ?.split(', ')
        .find(url => url.includes('next'))
        ?.split('; ')[0]
        .replace('<', '')
        .replace('>', '');

      for (const { id, name, html_url, slug } of response.data) {
        const teamInfo = {
          id,
          name,
          html_url,
          avatar_url: `https://avatars.githubusercontent.com/t/${id}`,
          numberOfMembers: '-',
        };

        const teamRes = await axios.get(`https://api.github.com/orgs/${owner}/teams/${slug}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Check if a new loading operation is on going
        if (localFetchDataExecutionId !== globalFetchDataExecutionId) {
          log({ localFetchDataExecutionId, globalFetchDataExecutionId });
          return;
        }

        teamInfo.numberOfMembers = teamRes.data.members_count;

        teams.push(teamInfo);
        log({ teamLoaded: teams.length });
        setFecthedRecords(teams.length);
      }
    }

    // Fetching teams data completed
  } catch (error) {
    console.error('Error fetching teams:', error.message);
    setFecthedRecords(0);
    setForbiddenError(true);
  }
};

const Teams = ({
  auth
}) => {
  const [list, setList] = useState([]);
  const [forbidden, setForbiddenError] = useState(false);

  const setFecthedRecords = () => {
    setList([...teams]);
  };

  useEffect(() => {
    setForbiddenError(false);
    getTeams(auth, setFecthedRecords, setForbiddenError);
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
