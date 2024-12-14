import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
// 导入默认样式
import 'es-drager/lib/style.css'

const app = createApp(App)

app.use(createPinia())
app.mount('#app')
