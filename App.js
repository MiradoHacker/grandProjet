import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Polyline } from "react-native-maps";

export default function App() {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [initialRegion, setInitialRegion] = useState(null);

  useEffect(() => {
    const backendUrl = `http://192.168.88.225:5000/route?start_city=Ampasapito&end_city=Antanimena`;

    fetch(backendUrl)
      .then((response) => response.json())
      .then((data) => {
        console.log("Données reçues:", data);
        if (Array.isArray(data) && data.length > 1) {
          // Transformer les données en format {latitude, longitude}
          const formattedData = data.map(([latitude, longitude]) => ({
            latitude,
            longitude,
          }));

          // Fonction pour effectuer une requête OSRM entre deux coordonnées
          const fetchRouteSegment = (startCoord, endCoord) => {
            const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${startCoord.longitude},${startCoord.latitude};${endCoord.longitude},${endCoord.latitude}?overview=full&geometries=geojson`;
            return fetch(osrmUrl)
              .then((response) => response.json())
              .then((osrmData) => {
                if (osrmData && osrmData.routes && osrmData.routes.length > 0) {
                  // Retourner les coordonnées du segment
                  return osrmData.routes[0].geometry.coordinates.map(
                    ([longitude, latitude]) => ({
                      latitude,
                      longitude,
                    })
                  );
                } else {
                  console.error("Aucun itinéraire trouvé pour ce segment.");
                  return [];
                }
              })
              .catch((error) => {
                console.error(
                  "Erreur lors de la récupération du segment:",
                  error
                );
                return [];
              });
          };

          // Fonction asynchrone pour traiter chaque segment
          const fetchAllSegments = async () => {
            let completeRoute = [];
            for (let i = 0; i < formattedData.length - 1; i++) {
              const startCoord = formattedData[i];
              const endCoord = formattedData[i + 1];
              const segment = await fetchRouteSegment(startCoord, endCoord);
              completeRoute = [...completeRoute, ...segment];
            }

            if (completeRoute.length > 0) {
              setRouteCoordinates(completeRoute);

              // Calcul de la région initiale pour centrer la carte
              const latitudes = completeRoute.map((coord) => coord.latitude);
              const longitudes = completeRoute.map((coord) => coord.longitude);

              const latMin = Math.min(...latitudes);
              const latMax = Math.max(...latitudes);
              const lonMin = Math.min(...longitudes);
              const lonMax = Math.max(...longitudes);

              setInitialRegion({
                latitude: (latMin + latMax) / 2,
                longitude: (lonMin + lonMax) / 2,
                latitudeDelta: latMax - latMin + 0.05,
                longitudeDelta: lonMax - lonMin + 0.05,
              });
            } else {
              console.error("Aucune route valide trouvée.");
            }
          };

          // Lancer la récupération de tous les segments
          fetchAllSegments();
        } else {
          console.error("Format de données inattendu:", data);
        }
      })
      .catch((error) =>
        console.error("Erreur de récupération de la route:", error)
      );
  }, []);

  console.log(routeCoordinates);

  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion}>
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#24D26D"
            strokeWidth={4}
          />
        )}
      </MapView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
