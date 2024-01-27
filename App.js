import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Button, Platform, StyleSheet, Text, View } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [download, setDownload] = useState();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const callback = (progress) => {
    const percentProgress = (
      (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) *
      100
    ).toFixed(2);
    setDownloadProgress(percentProgress);
  };

  useEffect(() => {
    const getDownloadable = async () => {
      try {
        const savedDownloadJSON = await AsyncStorage.getItem("download");

        if (savedDownloadJSON !== undefined && savedDownloadJSON !== null) {
          const savedDownload = JSON.parse(savedDownloadJSON);
          const downloadResumable = FileSystem.createDownloadResumable(
            savedDownload.url,
            savedDownload.fileUri,
            savedDownload.options,
            callback,
            savedDownload.resumeData
          );

          setDownload(downloadResumable);
          setIsPaused(true);
          setIsDownloading(true);
        } else {
          const downloadResumable = FileSystem.createDownloadResumable(
            "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            FileSystem.documentDirectory + "large.mp4",
            {},
            callback
          );
          setDownload(downloadResumable);
        }
      } catch (e) {
        console.log(e);
      }
    };
    getDownloadable();

    return async () => {
      if (isDownloading) {
        await pauseDownload();
      }
    };
  }, []);

  const downloadFile = async () => {
    setIsDownloading(true);
    const { uri } = await download.downloadAsync();
    AsyncStorage.removeItem("download");
    setIsDownloaded(true);
  };

  const pauseDownload = async () => {
    setIsPaused(true);
    await download.pauseAsync();
    AsyncStorage.setItem("download", JSON.stringify(download.savable()));
    console.log("Paused download");
  };

  const resumeDownload = async () => {
    setIsPaused(false);
    const { uri } = await download.resumeAsync();
    AsyncStorage.removeItem("download");
    setIsDownloaded(true);
  };

  const resetDownload = async () => {
    setIsDownloaded(false);
    setIsDownloading(false);
    setIsPaused(false);
    setDownloadProgress(0);

    AsyncStorage.removeItem("download");
    const downloadResumable = FileSystem.createDownloadResumable(
      "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      FileSystem.documentDirectory + "large.mp4",
      {},
      callback
    );
    setDownload(downloadResumable);
  };

  const exportDownload = async () => {
    if (Platform.OS === "android") {
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const base64 = await FileSystem.readAsStringAsync(
          FileSystem.documentDirectory + "large.mp4",
          { encoding: FileSystem.EncodingType.Base64 }
        );

        await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          "large.mp4",
          "application/mp4"
        )
          .then(async (uri) => {
            await FileSystem.writeAsStringAsync(uri, base64, {
              encoding: FileSystem.EncodingType.base64,
            });
          })
          .catch((e) => console.log(e));
      }
    } else {
      await Sharing.shareAsync(FileSystem.documentDirectory + "large.mp4");
    }
  };

  return (
    <View style={styles.container}>
      {isDownloading && <Text>Progress: {downloadProgress}%</Text>}
      {!isDownloading && !isPaused && (
        <Button title="Download" onPress={downloadFile} />
      )}
      {isDownloading && !isPaused && (
        <Button title="Pause" onPress={pauseDownload} />
      )}
      {isPaused && <Button title="Resume" onPress={resumeDownload} />}
      {(isDownloading || isDownloaded) && (
        <Button title="Reset" onPress={resetDownload} />
      )}

      {isDownloaded && <Button title="Export File" onPress={exportDownload} />}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
