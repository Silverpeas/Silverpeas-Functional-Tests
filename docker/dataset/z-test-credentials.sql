--
-- Sets well-known passwords to the users of the dataset so that the functional tests can sign in.
-- Executed by PostgreSQL after silverpeas.sql (alphabetical order) at the database initialization.
--   - SilverAdmin (domain Silverpeas, id 0): SilverAdmin
--   - all the users of the domain Snowpeas (id 1), jdoo1 to jdoo45: silverpeas
-- The hashes are SHA-512 crypt digests (openssl passwd -6).
--
\connect silverpeas

UPDATE public.domainsp_user
   SET password = '$6$OEaZPvMPbaBMDAlZ$2XNxrA4ceC.EDEhpnYi1vdhHUeGDE3BkMX0LR5m3OxkU/2kiTHFScFUKmoZDvoQN26oIPvgqusB0feqz3d/5c/', passwordvalid = 'Y'
 WHERE login = 'SilverAdmin';

UPDATE public.domain1snowpeas_user
   SET password = '$6$GyJCnMKt9ExR.aAO$jBNHk7BzY3RrY/CGpSvJEOme43yeYLIAHVFFQB.ehRNAx/waJ6jQtxuX.Q/nUZ6gP0Hf1drshkwmsZUrDciEH0', passwordvalid = 'Y';
