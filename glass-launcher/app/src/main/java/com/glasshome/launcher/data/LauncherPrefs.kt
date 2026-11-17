package com.glasshome.launcher.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class LauncherPrefs(context: Context) {
    private val sp = context.getSharedPreferences("glass_launcher", Context.MODE_PRIVATE)

    private val _dock = MutableStateFlow(
        sp.getString("dock", "")!!.split("|").filter { it.isNotEmpty() }
    )
    val dock: StateFlow<List<String>> = _dock
    val dockInitialized: Boolean get() = sp.contains("dock")

    private val _hidden = MutableStateFlow(sp.getStringSet("hidden", emptySet())!!.toSet())
    val hidden: StateFlow<Set<String>> = _hidden

    private fun list(key: String, def: List<String>): List<String> =
        sp.getString(key, null)?.split("|")?.filter { it.isNotEmpty() } ?: def

    private val _homeWidgets = MutableStateFlow(list("home_widgets", listOf("clock", "calendar", "battery")))
    val homeWidgets: StateFlow<List<String>> = _homeWidgets
    private val _todayWidgets = MutableStateFlow(list("today_widgets", listOf("calendar", "battery", "clock")))
    val todayWidgets: StateFlow<List<String>> = _todayWidgets

    fun setHomeWidgets(v: List<String>) {
        _homeWidgets.value = v
        sp.edit().putString("home_widgets", v.joinToString("|")).apply()
    }

    fun setTodayWidgets(v: List<String>) {
        _todayWidgets.value = v
        sp.edit().putString("today_widgets", v.joinToString("|")).apply()
    }

    /** System wallpaper id at the moment our own copy was applied; tells whether the copy still matches. */
    var copyWallpaperId: Int
        get() = sp.getInt("copy_wp_id", Int.MIN_VALUE)
        set(v) = sp.edit().putInt("copy_wp_id", v).apply()

    private val _lockToo = MutableStateFlow(sp.getBoolean("lock_too", true))
    val lockToo: StateFlow<Boolean> = _lockToo
    fun setLockToo(v: Boolean) {
        _lockToo.value = v
        sp.edit().putBoolean("lock_too", v).apply()
    }

    private val _bannerDismissed = MutableStateFlow(sp.getBoolean("banner_dismissed", false))
    val bannerDismissed: StateFlow<Boolean> = _bannerDismissed
    fun dismissBanner() {
        _bannerDismissed.value = true
        sp.edit().putBoolean("banner_dismissed", true).apply()
    }

    /** Index of the preset last applied from the launcher, -1 = own photo, -2 = something set elsewhere. */
    private val _wallpaper = MutableStateFlow(sp.getInt("wallpaper", -2))
    val wallpaper: StateFlow<Int> = _wallpaper
    private val _wallpaperVersion = MutableStateFlow(0)
    val wallpaperVersion: StateFlow<Int> = _wallpaperVersion

    private val _showLabels = MutableStateFlow(sp.getBoolean("labels", true))
    val showLabels: StateFlow<Boolean> = _showLabels

    private val _iconScale = MutableStateFlow(sp.getFloat("icon_scale", 1f))
    val iconScale: StateFlow<Float> = _iconScale

    fun setDock(keys: List<String>) {
        _dock.value = keys
        sp.edit().putString("dock", keys.joinToString("|")).apply()
    }

    /** Returns false when the dock is already full. */
    fun toggleDock(key: String, max: Int): Boolean {
        val cur = _dock.value
        if (key in cur) {
            setDock(cur - key)
            return true
        }
        if (cur.size >= max) return false
        setDock(cur + key)
        return true
    }

    fun hide(key: String) = setHidden(_hidden.value + key)
    fun unhide(key: String) = setHidden(_hidden.value - key)
    fun unhideAll() = setHidden(emptySet())

    private fun setHidden(set: Set<String>) {
        _hidden.value = set
        sp.edit().putStringSet("hidden", set).apply()
    }

    fun bumpWallpaper() {
        _wallpaperVersion.value += 1
    }

    fun setWallpaper(id: Int) {
        _wallpaper.value = id
        _wallpaperVersion.value += 1
        sp.edit().putInt("wallpaper", id).apply()
    }

    fun setShowLabels(v: Boolean) {
        _showLabels.value = v
        sp.edit().putBoolean("labels", v).apply()
    }

    fun setIconScale(v: Float) {
        _iconScale.value = v
        sp.edit().putFloat("icon_scale", v).apply()
    }
}
