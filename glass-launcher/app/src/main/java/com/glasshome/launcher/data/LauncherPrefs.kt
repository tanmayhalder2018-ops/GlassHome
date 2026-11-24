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

    private val _homeCols = MutableStateFlow(sp.getInt("home_cols", 0))
    val homeCols: StateFlow<Int> = _homeCols
    private val _homeRows = MutableStateFlow(sp.getInt("home_rows", 0))
    val homeRows: StateFlow<Int> = _homeRows
    private val _libCols = MutableStateFlow(sp.getInt("lib_cols", 0))
    val libCols: StateFlow<Int> = _libCols
    private val _libIconScale = MutableStateFlow(sp.getFloat("lib_icon_scale", 1f))
    val libIconScale: StateFlow<Float> = _libIconScale

    /** 0 = automatic. */
    fun setHomeCols(v: Int) { _homeCols.value = v; sp.edit().putInt("home_cols", v).apply() }
    fun setHomeRows(v: Int) { _homeRows.value = v; sp.edit().putInt("home_rows", v).apply() }
    fun setLibCols(v: Int) { _libCols.value = v; sp.edit().putInt("lib_cols", v).apply() }
    fun setLibIconScale(v: Float) { _libIconScale.value = v; sp.edit().putFloat("lib_icon_scale", v).apply() }

    private val _iconShape = MutableStateFlow(
        IconShape(
            sp.getFloat("icon_round", IconShape.Default.roundness),
            sp.getBoolean("icon_smooth", IconShape.Default.smooth),
        ),
    )
    val iconShape: StateFlow<IconShape> = _iconShape
    fun setIconShape(v: IconShape) {
        _iconShape.value = v
        sp.edit().putFloat("icon_round", v.roundness).putBoolean("icon_smooth", v.smooth).apply()
    }

    // ---- Locked hidden apps ----
    private val _secret = MutableStateFlow(sp.getStringSet("secret_apps", emptySet())!!.toSet())
    /** Apps hidden behind a lock: not on Home, Dock, App Library or Search. */
    val secret: StateFlow<Set<String>> = _secret
    fun hideLocked(key: String) = setSecret(_secret.value + key)
    fun unhideLocked(key: String) = setSecret(_secret.value - key)
    private fun setSecret(v: Set<String>) {
        _secret.value = v
        sp.edit().putStringSet("secret_apps", v).apply()
    }

    /** "device" = phone's own lock (fingerprint / face / PIN), "pin" = launcher PIN. */
    private val _lockMode = MutableStateFlow(sp.getString("lock_mode", "device")!!)
    val lockMode: StateFlow<String> = _lockMode
    fun setLockMode(v: String) {
        _lockMode.value = v
        sp.edit().putString("lock_mode", v).apply()
    }

    val hasPin: Boolean get() = sp.contains("pin_hash")

    fun setPin(pin: String) {
        val salt = java.util.UUID.randomUUID().toString()
        sp.edit().putString("pin_salt", salt).putString("pin_hash", hash(salt, pin)).apply()
    }

    fun checkPin(pin: String): Boolean {
        val salt = sp.getString("pin_salt", null) ?: return false
        return sp.getString("pin_hash", null) == hash(salt, pin)
    }

    private fun hash(salt: String, pin: String): String =
        java.security.MessageDigest.getInstance("SHA-256")
            .digest((salt + ":" + pin).toByteArray())
            .joinToString("") { "%02x".format(it) }

    // ---- Launch history (for App Library "Suggestions") ----
    private val _lastLaunch = MutableStateFlow(
        sp.all.filterKeys { it.startsWith("launch_") }
            .mapNotNull { (k, v) -> (v as? Long)?.let { k.removePrefix("launch_") to it } }
            .toMap(),
    )
    val lastLaunch: StateFlow<Map<String, Long>> = _lastLaunch
    fun recordLaunch(key: String) {
        val t = System.currentTimeMillis()
        _lastLaunch.value = _lastLaunch.value + (key to t)
        sp.edit().putLong("launch_$key", t).apply()
    }

    private val _doubleTapLock = MutableStateFlow(sp.getBoolean("double_tap_lock", true))
    val doubleTapLock: StateFlow<Boolean> = _doubleTapLock
    fun setDoubleTapLock(v: Boolean) {
        _doubleTapLock.value = v
        sp.edit().putBoolean("double_tap_lock", v).apply()
    }

    private val _libraryFolders = MutableStateFlow(sp.getBoolean("library_folders", true))
    val libraryFolders: StateFlow<Boolean> = _libraryFolders
    fun setLibraryFolders(v: Boolean) {
        _libraryFolders.value = v
        sp.edit().putBoolean("library_folders", v).apply()
    }

    fun setIconScale(v: Float) {
        _iconScale.value = v
        sp.edit().putFloat("icon_scale", v).apply()
    }
}
