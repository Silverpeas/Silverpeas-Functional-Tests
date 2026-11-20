/**
 * The users of the dataset used by the tests. Their passwords are set at the database
 * initialization by docker/dataset/z-test-credentials.sql.
 */
export interface TestUser {
  /** key identifying the user, used to name the file of its saved session */
  key: string;
  login: string;
  password: string;
  /** identifier of the user domain in Silverpeas */
  domainId: string;
  /** full name as displayed in Silverpeas */
  fullName: string;
}

export const AUTH_DIR = '.auth';

export const users = {
  /** the administrator of the platform (domain Silverpeas) */
  admin: {
    key: 'admin',
    login: process.env.SILVERPEAS_ADMIN_LOGIN ?? 'SilverAdmin',
    password: process.env.SILVERPEAS_ADMIN_PASSWORD ?? 'SilverAdmin',
    domainId: '0',
    fullName: 'Administrateur',
  },
  /** a simple user (domain Snowpeas) */
  user: {
    key: 'user',
    login: 'jdoo3',
    password: process.env.SILVERPEAS_USERS_PASSWORD ?? 'silverpeas',
    domainId: '1',
    fullName: 'John Doo3',
  },
} satisfies Record<string, TestUser>;

export function storageStateOf(user: TestUser): string {
  return `${AUTH_DIR}/${user.key}.json`;
}
