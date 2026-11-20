/**
 * The users of the dataset used by the tests. Their passwords are set at the database
 * initialization by docker/dataset/z-test-credentials.sql.
 *
 * Each role is played by a pool of users, one per parallel worker: two tests running in parallel
 * never sign in the same user at the same time. Indeed, concurrent authentications of a same user
 * can fail (both get the same authentication key and then the opening of their session fails).
 */
export interface TestUser {
  login: string;
  password: string;
  /** identifier of the user domain in Silverpeas */
  domainId: string;
  /** full name as displayed in Silverpeas */
  fullName: string;
  /** last name, by which the user can be searched in the users selections */
  lastName: string;
}

export type Role = 'admin' | 'publisher' | 'writer' | 'user';

const usersPassword = process.env.SILVERPEAS_USERS_PASSWORD ?? 'silverpeas';

/** a user of the domain Silverpeas (id 0) */
function silverpeasUser(login: string, firstName: string, lastName: string): TestUser {
  return { login, password: usersPassword, domainId: '0', fullName: `${firstName} ${lastName}`, lastName };
}

/** a user of the domain Snowpeas (id 1): John DooN */
function snowpeasUser(login: string): TestUser {
  const lastName = login.replace(/^jdoo/, 'Doo');
  return { login, password: usersPassword, domainId: '1', fullName: `John ${lastName}`, lastName };
}

const pools: Record<Role, TestUser[]> = {
  /** the administrator of the platform: only one, never sign it in in parallel */
  admin: [{
    login: process.env.SILVERPEAS_ADMIN_LOGIN ?? 'SilverAdmin',
    password: process.env.SILVERPEAS_ADMIN_PASSWORD ?? 'SilverAdmin',
    domainId: '0',
    fullName: 'Administrateur',
    lastName: 'Administrateur',
  }],
  /** members of the group Publieurs: publishers in the Kmelia instances of the Espace Collaboratif */
  publisher: [
    silverpeasUser('cvaldor', 'Clara', 'Valdor'),
    silverpeasUser('sorvane', 'Sophie', 'Orvane'),
    silverpeasUser('tlambrec', 'Théo', 'Lambrec'),
    silverpeasUser('mquentel', 'Marc', 'Quentel'),
    silverpeasUser('npeyrelle', 'Noa', 'Peyrelle'),
  ],
  /** members of the group Rédacteurs (and Lecteurs) */
  writer: ['jdoo1', 'jdoo10', 'jdoo11', 'jdoo100', 'jdoo101'].map(snowpeasUser),
  /** members of the group Lecteurs only: simple readers */
  user: ['jdoo3', 'jdoo4', 'jdoo5', 'jdoo6', 'jdoo7'].map(snowpeasUser),
};

/** The administrator of the platform. */
export const admin: TestUser = pools.admin[0];

/**
 * Gets the user playing the given role for the given parallel worker (testInfo.parallelIndex).
 */
export function userFor(role: Role, parallelIndex: number): TestUser {
  const pool = pools[role];
  if (role === 'admin') {
    return admin;
  }
  if (parallelIndex >= pool.length) {
    throw new Error(`No ${role} user for the worker ${parallelIndex}: at most ${pool.length} workers`);
  }
  return pool[parallelIndex];
}
