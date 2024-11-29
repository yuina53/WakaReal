<template>
  <div class="camera-container">
    <!-- 撮影した写真がある場合 -->
    <img v-if="photo" :src="photo" alt="Captured Photo" class="captured-photo" />
    
    <!-- カメラ映像 -->
    <video v-if="!photo" ref="video" autoplay playsinline></video>

    <!-- ボタンコンテナ -->
    <div class="button-container" v-if="!photo">
    <!-- ホームボタン -->
      <button class="home-button" @click="goHome">
        <img 
          src="@/assets/ホーム.png" 
          alt="ホーム" 
          class="home-icon" 
        />
      </button>
      <!-- 撮影ボタン -->
      <button class="capture" @click="takePhoto"></button>
      <!-- カメラ切り替えボタン -->
      <button @click="switchCamera" class="switch-camera-button">
        <img 
          src="@/assets/切り替え.png" 
          alt="カメラ切り替え" 
          class="switch-camera-icon" 
        />
      </button>
    </div>

    

    <!-- 取り直しと投稿 -->
    <div v-if="photo">
      
      <div>
        <label for="location">観光地名 </label>
        <input v-model="location" id="location" type="text" placeholder="観光地名を入力" />
      </div>
      <div>
        <label for="comment">ひとこと </label>
        <input v-model="comment" id="comment" type="text" placeholder="ひとことを入力" />
      </div>
      
      <div class="button-space">
      <button class="retake-button" @click="retakePhoto">撮り直し</button>
      <button class="post-button" @click="postPhoto">投稿</button>
     </div>
    </div>

    <canvas ref="canvas" style="display: none;"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { db, collection, addDoc } from './firebase';
import { Timestamp } from 'firebase/firestore';
import { useRouter } from 'vue-router';

const video = ref(null);
const canvas = ref(null);
const photo = ref(null);
const location = ref("");
const comment = ref("");
const latitude = ref(null);
const longitude = ref(null);
const router = useRouter();
const currentDeviceId = ref(null);

// ホームに戻る関数
const goHome = () => {
  router.push('/');
};

// 撮影した写真を保存
const takePhoto = () => {
  const context = canvas.value.getContext('2d');
  const videoWidth = video.value.videoWidth;
  const videoHeight = video.value.videoHeight;
  canvas.value.width = videoWidth;
  canvas.value.height = videoHeight;
  context.drawImage(video.value, 0, 0, videoWidth, videoHeight);
  photo.value = canvas.value.toDataURL('image/jpeg');
};



// 位置情報を取得する関数
const getLocation = async () => {
  if (!navigator.geolocation) {
    console.error("Geolocation APIがサポートされていません");
    return;
  }
  
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        latitude.value = position.coords.latitude;
        longitude.value = position.coords.longitude;
        resolve();
      },
      (error) => {
        console.error("位置情報の取得に失敗しました: ", error);
        reject(error);
      }
    );
  });
};

// 撮影した写真をFirestoreに保存する関数
const savePhotoToFirestore = async (photoData, location, comment, lat, lng) => {
  try {
    await addDoc(collection(db, "photos"), {
      photo: photoData,
      location: location,
      comment: comment,
      latitude: lat,
      longitude: lng,
      timestamp: Timestamp.now()
    });
    console.log("写真が保存されました。");
  } catch (e) {
    console.error("写真の保存に失敗しました: ", e);
  }
};

const retakePhoto = () => {
  photo.value = null;
  location.value = "";
  comment.value = "";
  latitude.value = null;
  longitude.value = null;
};

const postPhoto = async () => {
  if (photo.value && location.value && comment.value) {
    try {
      await getLocation();
      await savePhotoToFirestore(photo.value, location.value, comment.value, latitude.value, longitude.value);
      console.log("投稿完了");
      router.push('/');
    } catch (e) {
      console.error("投稿時にエラーが発生しました: ", e);
    }
  } else {
    console.log("全てのフィールドを入力してください。");
  }
};

// カメラ関連
const startCamera = async (deviceId = null) => {
  try {
    const constraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.value.srcObject = stream;
    const track = stream.getVideoTracks()[0];
    currentDeviceId.value = track.getSettings().deviceId;
  } catch (err) {
    console.error('カメラの取得に失敗しました:', err);
  }
};

const switchCamera = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((device) => device.kind === 'videoinput');
  const nextDevice = videoDevices[(videoDevices.findIndex((device) => device.deviceId === currentDeviceId.value) + 1) % videoDevices.length];
  currentDeviceId.value = nextDevice.deviceId;
  startCamera(nextDevice.deviceId);
};

onMounted(() => {
  startCamera();
});
</script>

<style scoped>
.camera-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

video, img {
  width: 70%;
  max-width: 100%;
  height: auto;
}

video {
  transform: scaleX(-1);
}


.captured-photo {
  width: 50%; 
  height: auto; 
  object-fit: cover; 
  margin-bottom: 20px; 
}


.button-container {
  display: flex;
  gap: 50px; 
  margin-top: 30px; 
  justify-content: center; 
  align-items: center; 
}


button.capture {
  width: 75px;
  height: 75px;
  border-radius: 50%;
  background-color: #ffffff; 
  border: 5px solid #ffa500; 
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box; 
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}


.switch-camera-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.switch-camera-icon {
  width: 30px;
  height: 30px;
}

input {
  margin: 10px 0;
  padding: 3px;
  font-size: 16px;
}

button.post-button {
  background-color: #ffa500; 
  color: white; 
  border-radius: 25px; 
  padding: 10px 20px; 
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  font-size: 16px;
  transition: background-color 0.3s;
  margin-left: 70px; 
}

button.post-button:hover {
  background-color: #e68900; 
}

button.retake-button:hover {
  background-color: #6E9CE6; 
}


button.retake-button {
  background-color: #8BB6FA;
  color: white; 
  border-radius: 25px; 
  padding: 10px 20px; 
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  font-size: 16px;
  transition: background-color 0.3s;
}


.home-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.home-icon {
  width: 30px;
  height: 30px;
}



.button-space {
  margin-top: 15px;
  margin-bottom: 15px; 
}
</style>
