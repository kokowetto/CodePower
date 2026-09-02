import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Login from '../views/Login.vue'
import UserApply from '../views/UserApply.vue'
import ManagerAdmin from '../views/manager/ManagerAdmin.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/apply',
    name: 'Apply',
    component: UserApply,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: ManagerAdmin,
    meta: { requiresAuth: true, requiresManager: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStr = localStorage.getItem('cp_user')
  const user = userStr ? JSON.parse(userStr) : null

  if (to.meta.requiresAuth && !user) {
    return next('/login')
  }

  if (to.path === '/login' && user) {
    if (user.role === 'manager') {
      return next('/admin')
    } else {
      return next('/apply')
    }
  }

  if (to.meta.requiresManager && user?.role !== 'manager') {
    return next('/apply')
  }

  next()
})

export default router
