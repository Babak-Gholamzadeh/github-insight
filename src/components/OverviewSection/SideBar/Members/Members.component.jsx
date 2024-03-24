import { useEffect, useState } from 'react';
import axios from 'axios';

import './Members.style.scss';

const getMembers = async ({ owner, token }) => {
  try {
    const members = [];

    if (owner && token) {
      let nextPageUrl = `https://api.github.com/orgs/${owner}/members?per_page=21&page=1`;
      const response = await axios.get(nextPageUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      members.push(...response.data.map(({ id, html_url, avatar_url, login }) => ({
        id,
        title: login,
        html_url,
        avatar_url,
      })));
    }

    return members;
  } catch (error) {
    console.error('Error fetching members:', error.message);
    return 403;
  }
};

const Members = ({
  auth
}) => {
  const [list, setList] = useState([]);
  const [forbidden, setForbiddenError] = useState(false);

  useEffect(() => {
    (async () => {
      const members = await getMembers(auth);
      if(Array.isArray(members)) {
        setForbiddenError(false);
        setList(members);
      } else {
        setForbiddenError(true);
      }
    })();
  }, [auth]);

  return (
    <div className="members">
      <h3 className='section-title'>Members</h3>
      {
        forbidden
          ? <div className='forbidden'>You don't have access to this section</div>
          : <div>
            <div className='member-list' >
              {list.slice(0, 20).map(({ id, html_url, avatar_url, title }) =>
                <a
                  href={html_url}
                  className="member-link"
                  target="_blank"
                  rel="noreferrer"
                  title={title}
                  key={id}
                >
                  <img src={avatar_url} className='member-avatar' alt='' />
                </a>
              )}
            </div>
            {
              list.length > 20
                ? <a
                  href={`https://github.com/orgs/${auth.owner}/people`}
                  className="view-all"
                  target="_blank"
                  rel="noreferrer"
                >View all</a>
                : null
            }
          </div>
      }
    </div >
  );
};

export default Members;
