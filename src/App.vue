<script setup>
import { RouterLink, useRoute } from 'vue-router';
import { ref, onMounted } from 'vue';
import { db, collection, getDocs } from './components/firebase';
import axios from 'axios';


// 必要なデータを管理
const route = useRoute();
const photos = ref([]);
const locations = ref([]);
const currentIndexes = ref({});
const userLocation = ref({ lat: null, lon: null });
const nearbyPhotos = ref([]);

// 「〇〇前」にフォーマットする関数
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return { text: '', isRecent: false };
  const now = new Date();
  const diffMs = now - timestamp; // 差分をミリ秒で計算
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return { text: `${diffSec}秒前`, isRecent: true };
  if (diffMin < 60) return { text: `${diffMin}分前`, isRecent: true };
  if (diffHour < 24) return { text: `${diffHour}時間前`, isRecent: false };
  return { text: `${diffDay}日前`, isRecent: false };
};

// Firestoreから写真を取得
const fetchSavedPhotos = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'photos'));
    const fetchedPhotos = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        timestamp: data.timestamp ? data.timestamp.toDate() : null,
      };
    });

    photos.value = fetchedPhotos.sort((a, b) => b.timestamp - a.timestamp);
    locations.value = [...new Set(fetchedPhotos.map((photo) => photo.location))];

    locations.value.forEach((location) => {
      currentIndexes.value[location] = 0;
    });
  } catch (e) {
    console.error('写真の取得に失敗しました: ', e);
  }
};

const fetchUserLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation.value.lat = position.coords.latitude;
        userLocation.value.lon = position.coords.longitude;
        filterNearbyPhotos();
      },
      (error) => {
        console.error('現在地の取得に失敗しました: ', error);
      }
    );
  } else {
    console.error('ブラウザがGeolocation APIに対応していません');
  }
};

const filterNearbyPhotos = () => {
  if (userLocation.value.lat && userLocation.value.lon) {
    nearbyPhotos.value = photos.value.filter((photo) => {
      const distance = calculateDistance(
        userLocation.value.lat,
        userLocation.value.lon,
        photo.latitude,
        photo.longitude
      );
      return distance <= 30;
    });

    
    if (nearbyPhotos.value.length > 0) {
      currentIndexes.value['nearby'] = 0;
    }
  }
};


const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const changePhoto = (location, direction) => {
  const filteredPhotos =
    location === 'nearby'
      ? nearbyPhotos.value
      : photos.value.filter((photo) => photo.location === location);

  const totalPhotos = filteredPhotos.length;
  currentIndexes.value[location] =
    (currentIndexes.value[location] + direction + totalPhotos) % totalPhotos;
};

onMounted(() => {
  fetchSavedPhotos().then(() => {
    fetchUserLocation();
  });
});

const openGoogleMaps = () => {
  const photo = nearbyPhotos.value[currentIndexes.value['nearby']];
  if (photo && photo.latitude && photo.longitude && userLocation.value.lat && userLocation.value.lon) {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.value.lat},${userLocation.value.lon}&destination=${photo.latitude},${photo.longitude}`;
    window.open(googleMapsUrl, '_blank');
  }
};

const openGoogleMapsForLocation = (location) => {
  const locationPhotos = photos.value.filter(photo => photo.location === location);
  const currentPhoto = locationPhotos[currentIndexes.value[location]];

  if (currentPhoto && currentPhoto.latitude && currentPhoto.longitude && userLocation.value.lat && userLocation.value.lon) {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.value.lat},${userLocation.value.lon}&destination=${currentPhoto.latitude},${currentPhoto.longitude}`;
    window.open(googleMapsUrl, '_blank');
  }
};


</script>

<template>
<header>
    <img alt="logo" class="logo" src="@/assets/ロゴ.jpg" width="450" height="300" />
    
  </header>

  <div class="home">
    <div v-if="nearbyPhotos.length > 0 && route.path !== '/camera'" class="location-section nearby-section">
      <h2>ここから30km圏内のリアル</h2>
      <h3 v-if="nearbyPhotos.length > 0">
        {{ nearbyPhotos[currentIndexes['nearby']]?.location }}
      </h3>
      <div class="photo-viewer">
        <button @click="changePhoto('nearby', -1)" class="arrow-button left-arrow">
         <img src="@/assets/左矢印ボタン.png" alt="左矢印" class="arrow-icon" />
        </button>
        <div class="photo-info">
  <div class="bubble-wrapper" v-if="formatRelativeTime(nearbyPhotos[currentIndexes['nearby']]?.timestamp).isRecent">
    <img src="@/assets/吹き出し.png" alt="吹き出し" class="bubble-image" />
    <span class="bubble-text">
      {{ formatRelativeTime(nearbyPhotos[currentIndexes['nearby']]?.timestamp).text }}
    </span>
  </div>
  <img
    :src="nearbyPhotos[currentIndexes['nearby']]?.photo"
    alt="Nearby Photo"
    class="current-photo"
  />
  <p class="comment">{{ nearbyPhotos[currentIndexes['nearby']]?.comment }}</p>
 <p 
  v-if="!formatRelativeTime(nearbyPhotos[currentIndexes['nearby']]?.timestamp).isRecent" 
  class="timestamp">
  {{ formatRelativeTime(nearbyPhotos[currentIndexes['nearby']]?.timestamp).text }}
</p>

  <p class="drive-time">
          <button class="round-button" @click="openGoogleMaps">
          <img src="@/assets/目的地アイコン.png" alt="ルート表示" class="root-icon" />
            
          </button>
        </p>
</div>

        <button @click="changePhoto('nearby', 1)" class="arrow-button right-arrow">
          <img src="@/assets/右矢印ボタン.png" alt="右矢印" class="arrow-icon" />
        </button>
      </div>
    </div>

    <div v-if="photos.length > 0 && route.path !== '/camera'">
      <h2 class="section-title">観光地別のリアル</h2>
      <div v-for="location in locations" :key="location" class="location-section">
  <h3>{{ location }}</h3>
  <div class="photo-viewer">
    <button @click="changePhoto(location, -1)" class="arrow-button left-arrow">
      <img src="@/assets/左矢印ボタン.png" alt="左矢印" class="arrow-icon" />
    </button>
    <div class="photo-info">
      <!-- 吹き出し表示 -->
      <div class="bubble-wrapper" 
           v-if="formatRelativeTime(photos.filter(photo => photo.location === location)[currentIndexes[location]]?.timestamp).isRecent">
        <img src="@/assets/吹き出し.png" alt="吹き出し" class="bubble-image" />
        <span class="bubble-text">
          {{ formatRelativeTime(photos.filter(photo => photo.location === location)[currentIndexes[location]]?.timestamp).text }}
        </span>
      </div>
      <!-- 写真表示 -->
      <img
        :src="photos.filter(photo => photo.location === location)[currentIndexes[location]]?.photo"
        alt="Current Photo"
        class="current-photo"
      />
      <p class="comment">
        {{ photos.filter(photo => photo.location === location)[currentIndexes[location]]?.comment }}
      </p>
      <p 
  v-if="!formatRelativeTime(
    photos.filter(photo => photo.location === location)[currentIndexes[location]]?.timestamp
  ).isRecent" 
  class="timestamp">
  {{ formatRelativeTime(
    photos.filter(photo => photo.location === location)[currentIndexes[location]]?.timestamp
  ).text }}
</p>
<p class="drive-time">
 <!-- Google Maps ボタン -->
      <button class="round-button" @click="openGoogleMapsForLocation(location)">
        <img src="@/assets/目的地アイコン.png" alt="ルート表示" class="root-icon" />
      </button>
      </p>

    </div>
  
    <button @click="changePhoto(location, 1)" class="arrow-button right-arrow">
      <img src="@/assets/右矢印ボタン.png" alt="右矢印" class="arrow-icon" />
    </button>
  </div>
</div>

    </div>
  </div>


  
  <RouterLink to="/camera">
    <button v-if="route.path !== '/camera'" class="fixed-button">
      <img src="@/assets/カメラアイコン8.png" alt="カメラを開く" class="switch-camera-icon" />
    </button>
  </RouterLink>

  <RouterView />
</template>


<style scoped>
.drive-time {
  position: absolute;
  bottom: 0px;
  right: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  
}
.round-button {
  width: 40px;
  height: 40px;
  background-color: #4CAF50;
  border-radius: 50%;
  border: none;
  box-shadow: 0 4px 8px rgba(0.1, 0.1, 0.1, 0.2);
}

.round-button:hover {
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.root-icon {
  width: 20px;
  height: 20px;
}


/* ロケーションセクション */
.location-section {
  margin-bottom: 40px;
  text-align: center;
  
  
}

.location-section.nearby-section {
  background-color: #FFECC0; 
  padding-top: 40px;
  padding-bottom: 40px;
  
}

.location-section h2 {
  margin-bottom: 20px;
  font-size: 20px;
  color: #777777;
  font-weight: bold; 
 
}


header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
  width: 100%;
  max-width: 450px;
  height: auto;
}


.section-title {
  text-align: center;  
  font-size: 20px;     
  font-weight: bold;    
  margin-bottom: 20px; 
  color: #777777;
}



/* 写真表示エリア */
.photo-viewer {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  margin-top: 20px;
  
}

.photo-info {
  position: relative; 
  text-align: center;
  margin-top: 10px;
}

.comment {
  font-size: 16px;
  color: #555;
  margin-top: 5px;
}

.timestamp {
  font-size: 14px;
  color: #888;
  margin-top: 3px;
}

.current-photo {
  width: 70%;
  max-width: 500px;
  height: auto;
  border: 1px solid #ccc;
  border-radius: 10px;
  object-fit: cover;
}

.arrow-button {
  position: relative;
  top: 45%;
  transform: translateY(-50%);
  font-size: 24px;
  background-color: rgba(0, 0, 0, 0);
  border: none;
  padding: 10px;
  cursor: pointer;
}

.left-arrow {
  left: 10px;
}

.right-arrow {
  right: 10px;
}

/* 画像アイコンのサイズ */
.arrow-icon {
  width: 30px;
  height: 30px;
}



/* カメラページボタン */
.fixed-button {
  position: fixed;
  bottom: 50px;
  right: 10px;
  transform: translateX(-50%);
  width: 80px;
  height: 80px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #FFA500;
  box-shadow: 0 4px 8px rgba(0.1, 0.1, 0.1, 0.2);
}

.fixed-button:hover {
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.switch-camera-icon {
  width: 40px;
  height: 40px;
}

/* 吹き出しスタイル */
.bubble-wrapper {
  position: absolute;
  top: 0px;
  left: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  
}

.bubble-image {
  width: 90px;
  height: 90px;
  filter: drop-shadow(5px 5px 10px rgba(0, 0, 0, 0.5));
}

.bubble-text {
  position: absolute;
  font-size: 16px;
  color: red;
  font-weight: bold;
}
</style>
