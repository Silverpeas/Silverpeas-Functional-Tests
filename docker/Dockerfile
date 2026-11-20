# Image of Silverpeas for the functional tests. It is based on the silverpeas-run image (that provides
# the Silverpeas installer, Wildfly, Java, and the dataset matching the database dump in dataset/)
# and adds to it an entrypoint that installs at startup the version of Silverpeas given by the
# SILVERPEAS_VERSION environment variable before starting it.
#
# When the Silverpeas installer (the silversetup Gradle plugin declared in bin/settings.gradle) is
# updated, rebuild the silverpeas-run image and then update SILVERPEAS_IMAGE in the .env file.
ARG SILVERPEAS_IMAGE=silverpeas-run:latest
FROM ${SILVERPEAS_IMAGE}

USER root
COPY --chmod=755 entrypoint.sh /usr/local/bin/silverpeas-entrypoint
# Gradle cache directory: mounted as a named volume to avoid downloading again the installer and
# the Silverpeas artifacts each time the container is recreated. Created here so that the volume
# is owned by silveruser.
RUN mkdir -p /home/silveruser/.gradle \
  && chown silveruser:silveruser /home/silveruser/.gradle
USER silveruser

ENTRYPOINT ["/usr/local/bin/silverpeas-entrypoint"]
