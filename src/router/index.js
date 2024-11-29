import { createRouter, createWebHistory } from 'vue-router';

import Camera from '../components/Camera.vue'; // Cameraコンポーネントをインポート

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    
    {
      path: '/camera', // 新しいカメラページへのルートを追加
      name: 'camera',
      component: Camera, // Cameraコンポーネントを表示
    },
  ],
});

export default router;
