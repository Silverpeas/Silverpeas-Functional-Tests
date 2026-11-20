--
-- Sets well-known passwords to the users of the dataset so that the functional tests can sign in.
-- Executed by PostgreSQL after silverpeas.sql (alphabetical order) at the database initialization.
--   - SilverAdmin (domain Silverpeas, id 0): SilverAdmin
--   - all the other users of the domain Silverpeas: silverpeas
--   - all the users of the domain Snowpeas (id 1), jdoo1, jdoo2, ...: silverpeas
-- The hashes are SHA-512 crypt digests (openssl passwd -6).
--
\connect silverpeas

UPDATE public.domainsp_user
   SET password = '$6$OEaZPvMPbaBMDAlZ$2XNxrA4ceC.EDEhpnYi1vdhHUeGDE3BkMX0LR5m3OxkU/2kiTHFScFUKmoZDvoQN26oIPvgqusB0feqz3d/5c/', passwordvalid = 'Y'
 WHERE login = 'SilverAdmin';

UPDATE public.domainsp_user
   SET password = '$6$NGCpRdLMzKA09nz7$NtWRTxZQsuzDHVZTsXB69FAmo2hSANUGoSuwD7geEvlYRTrQz4vbDgu./QmJDOobkFDPvwHrX6cVwdg59fmek0', passwordvalid = 'Y'
 WHERE login <> 'SilverAdmin';

UPDATE public.domain1snowpeas_user
   SET password = '$6$GyJCnMKt9ExR.aAO$jBNHk7BzY3RrY/CGpSvJEOme43yeYLIAHVFFQB.ehRNAx/waJ6jQtxuX.Q/nUZ6gP0Hf1drshkwmsZUrDciEH0', passwordvalid = 'Y';
