FROM adoptopenjdk:11-jre-hotspot

ADD build/libs/covid-0.0.1-SNAPSHOT.jar covid.jar

ENTRYPOINT exec java -jar covid.jar