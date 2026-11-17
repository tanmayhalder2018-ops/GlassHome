package com.glasshome.launcher.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

const val MAX_DOCK = 8

class LauncherPrefs(context: Context) {
    private val sp = context.getSharedPreferences("glass_launcher", Context.MODE_PRIVATE)

    private val _dock = MutableStateFlow(
        sp.getString("dock", "")!!.split("|").filter { it.isNotEmpty() }
    )
    val dock: StateFlow<List<String>> = _dock
    val dockInitialized: Boolean get() = sp.contains("dock")

    private val _hidden = MutableStateFlow(sp.getStringSet("hidden", emptySet())!!.toSet())
    val hidden: StateFlow<Set<String>> = _hidden

    /** Index into Wallpapers.presets, or -1 for the user's own photo. */
    private val _wallpaper = MutableStateFlow(sp.getInt("wallpaper", 0))
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
    fun toggleDock(key: String): Boolean {
        val cur = _dock.value
        if (key in cur) {
            setDock(cur - key)
            return true
        }
        if (cur.size >= MAX_DOCK) return false
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
