package com.glasshome.launcher.data

import android.content.ComponentName
import android.content.Context
import android.content.pm.LauncherApps
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Path
import android.graphics.Rect
import android.graphics.drawable.AdaptiveIconDrawable
import android.graphics.drawable.Drawable
import android.os.Handler
import android.os.Looper
import android.os.UserHandle
import android.os.UserManager
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

@Immutable
data class AppInfo(
    val key: String,
    val label: String,
    val component: ComponentName,
    val user: UserHandle,
    val icon: ImageBitmap,
)

/** Loads every launchable app and keeps the list fresh as apps are installed or removed. */
class AppRepository(private val context: Context, private val scope: CoroutineScope) {
    private val launcherApps = context.getSystemService(LauncherApps::class.java)
    private val userManager = context.getSystemService(UserManager::class.java)
    private val iconCache = HashMap<String, ImageBitmap>()
    private val _apps = MutableStateFlow<List<AppInfo>>(emptyList())
    val apps: StateFlow<List<AppInfo>> = _apps
    private var job: Job? = null
    private val iconPx = (context.resources.displayMetrics.density * 84).toInt().coerceIn(128, 256)

    private val callback = object : LauncherApps.Callback() {
        override fun onPackageRemoved(packageName: String, user: UserHandle) = reload(packageName)
        override fun onPackageAdded(packageName: String, user: UserHandle) = reload(packageName)
        override fun onPackageChanged(packageName: String, user: UserHandle) = reload(packageName)
        override fun onPackagesAvailable(packageNames: Array<out String>, user: UserHandle, replacing: Boolean) {
            packageNames.forEach { invalidate(it) }
            reload(null)
        }
        override fun onPackagesUnavailable(packageNames: Array<out String>, user: UserHandle, replacing: Boolean) {
            packageNames.forEach { invalidate(it) }
            reload(null)
        }
    }

    fun start() {
        launcherApps.registerCallback(callback, Handler(Looper.getMainLooper()))
        reload(null)
    }

    fun stop() {
        launcherApps.unregisterCallback(callback)
    }

    private fun invalidate(pkg: String) {
        synchronized(iconCache) { iconCache.keys.removeAll { it.startsWith("$pkg/") } }
    }

    fun reload(changedPackage: String?) {
        if (changedPackage != null) invalidate(changedPackage)
        job?.cancel()
        job = scope.launch(Dispatchers.Default) {
            val density = context.resources.displayMetrics.densityDpi
            val list = launcherApps.profiles.flatMap { user ->
                runCatching { launcherApps.getActivityList(null, user) }.getOrDefault(emptyList())
                    .map { it to user }
            }.filter { (info, _) -> info.componentName.packageName != context.packageName }
                .map { (info, user) ->
                    val key = info.componentName.flattenToShortString() + "#" + userManager.getSerialNumberForUser(user)
                    val icon = synchronized(iconCache) { iconCache[key] } ?: run {
                        val drawable = runCatching { info.getIcon(density) }.getOrNull()
                            ?: context.packageManager.defaultActivityIcon
                        IconRenderer.render(drawable, iconPx).asImageBitmap().also {
                            synchronized(iconCache) { iconCache[key] = it }
                        }
                    }
                    AppInfo(key, info.label?.toString() ?: info.componentName.packageName, info.componentName, user, icon)
                }
                .sortedWith(compareBy(String.CASE_INSENSITIVE_ORDER) { it.label })
            _apps.value = list
        }
    }
}

/** Renders any app icon as an iOS-style rounded square. */
object IconRenderer {
    fun render(drawable: Drawable, size: Int): Bitmap {
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val s = size.toFloat()
        val clip = Path().apply { addRoundRect(0f, 0f, s, s, s * 0.225f, s * 0.225f, Path.Direction.CW) }
        canvas.clipPath(clip)
        if (drawable is AdaptiveIconDrawable) {
            // Adaptive layers are 108dp with the visible 72dp in the middle.
            val inset = (size * 0.25f).toInt()
            val bounds = Rect(-inset, -inset, size + inset, size + inset)
            val bg = drawable.background
            if (bg != null) {
                bg.bounds = bounds
                bg.draw(canvas)
            } else {
                canvas.drawColor(Color.WHITE)
            }
            drawable.foreground?.let {
                it.bounds = bounds
                it.draw(canvas)
            }
        } else {
            canvas.drawColor(Color.WHITE)
            val pad = (size * 0.14f).toInt()
            drawable.setBounds(pad, pad, size - pad, size - pad)
            drawable.draw(canvas)
        }
        bmp.prepareToDraw()
        return bmp
    }
}
