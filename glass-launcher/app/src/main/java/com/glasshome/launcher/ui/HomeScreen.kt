package com.glasshome.launcher.ui

import android.app.KeyguardManager
import android.app.WallpaperManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerDefaults
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.BlurEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.glasshome.launcher.MainActivity
import com.glasshome.launcher.data.AppInfo
import com.glasshome.launcher.data.AppRepository
import com.glasshome.launcher.data.LauncherPrefs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

private val PreferredDock = listOf(
    "com.sec.android.app.sbrowser", "com.android.chrome", "com.google.android.youtube",
    "com.google.android.gm", "com.samsung.android.messaging", "com.google.android.apps.messaging",
    "com.whatsapp", "com.oneplus.gallery", "com.sec.android.gallery3d", "com.google.android.apps.photos",
    "com.oplus.camera", "com.sec.android.app.camera", "com.spotify.music", "com.google.android.dialer",
    "com.android.settings",
)

private fun defaultDock(apps: List<AppInfo>, max: Int): List<String> {
    val picked = LinkedHashMap<String, String>()
    for (pkg in PreferredDock) {
        if (picked.size >= max) break
        apps.firstOrNull { it.component.packageName == pkg }?.let { picked.putIfAbsent(pkg, it.key) }
    }
    if (picked.size < max) apps.take(max - picked.size).forEach { picked.putIfAbsent(it.component.packageName, it.key) }
    return picked.values.take(max)
}

private class Grid(val cols: Int, val rows: Int, val widgetRows: Int)

/** Layout numbers for tablet vs phone. */
private class Profile(phone: Boolean) {
    val iconBase = if (phone) 60f else 66f
    val dockMax = if (phone) 4 else 8
    val dockSpacing = if (phone) 18.dp else 20.dp
    val todayCols = if (phone) 1 else 2
    val colRange = if (phone) 4..5 else 4..9
    val rowRange = if (phone) 4..7 else 3..7
    val userColRange = if (phone) 3..7 else 3..12
    val userRowRange = if (phone) 3..9 else 3..9
    val libRange = if (phone) 3..7 else 3..12
    val cellW = if (phone) 84.dp else 150.dp
    val cellExtraH = if (phone) 50.dp else 62.dp
    val cellMinH = if (phone) 100.dp else 118.dp
    val topReserve = if (phone) 30.dp else 40.dp
    val searchCellExtra = if (phone) 28.dp else 46.dp
}

@Composable
fun LauncherApp(
    activity: MainActivity,
    repo: AppRepository,
    prefs: LauncherPrefs,
    widgets: WidgetController,
    phone: Boolean,
) {
    val ctx = LocalContext.current
    val profile = remember(phone) { Profile(phone) }
    val apps by repo.apps.collectAsStateWithLifecycle()
    val dockKeys by prefs.dock.collectAsState()
    val hidden by prefs.hidden.collectAsState()
    val wallpaperId by prefs.wallpaper.collectAsState()
    val wallpaperVersion by prefs.wallpaperVersion.collectAsState()
    val showLabels by prefs.showLabels.collectAsState()
    val iconScale by prefs.iconScale.collectAsState()
    val homeColsPref by prefs.homeCols.collectAsState()
    val homeRowsPref by prefs.homeRows.collectAsState()
    val libColsPref by prefs.libCols.collectAsState()
    val libIconScale by prefs.libIconScale.collectAsState()
    val iconShape by prefs.iconShape.collectAsState()
    LaunchedEffect(iconShape) { repo.setShape(iconShape) }
    val homeWidgets by prefs.homeWidgets.collectAsState()
    val todayWidgets by prefs.todayWidgets.collectAsState()
    val lockToo by prefs.lockToo.collectAsState()
    val bannerDismissed by prefs.bannerDismissed.collectAsState()

    val scope = rememberCoroutineScope()
    val keyboard = LocalSoftwareKeyboardController.current
    val focusManager = LocalFocusManager.current
    val overlay = remember { OverlayController(scope) }
    val overlayOpen by remember { derivedStateOf { overlay.progress > 0f } }
    var editMode by remember { mutableStateOf(false) }
    var menu by remember { mutableStateOf<MenuState?>(null) }
    val menuAnim = remember { Animatable(0f) }
    var settingsOpen by remember { mutableStateOf(false) }
    val settingsAnim = animateFloatAsState(
        if (settingsOpen) 1f else 0f, spring(dampingRatio = 0.86f, stiffness = 320f), label = "settings",
    )
    val settingsVisible by remember { derivedStateOf { settingsAnim.value > 0.001f } }
    var pickerTarget by remember { mutableStateOf<String?>(null) } // "home" | "today"
    val pickerAnim = animateFloatAsState(
        if (pickerTarget != null) 1f else 0f, spring(dampingRatio = 0.86f, stiffness = 320f), label = "picker",
    )
    val pickerVisible by remember { derivedStateOf { pickerAnim.value > 0.001f } }
    var lastPickerTarget by remember { mutableStateOf("home") }
    val entrance = remember { Animatable(1f) }
    val unlock = remember { Animatable(1f) }
    var hasAccess by remember { mutableStateOf(Wallpapers.hasSystemAccess()) }
    var wallpaperReload by remember { mutableIntStateOf(0) }
    val seenSystemId = remember { intArrayOf(Wallpapers.systemId(ctx)) }
    var applying by remember { mutableStateOf(false) }

    LaunchedEffect(apps) {
        if (apps.isNotEmpty() && !prefs.dockInitialized) prefs.setDock(defaultDock(apps, if (phone) 4 else 6))
    }

    val appByKey = remember(apps) { apps.associateBy { it.key } }
    val dockApps = remember(dockKeys, appByKey) { dockKeys.mapNotNull { appByKey[it] }.take(profile.dockMax) }
    val homeApps = remember(apps, dockApps, hidden) {
        val dockSet = dockApps.map { it.key }.toSet()
        apps.filter { it.key !in hidden && it.key !in dockSet }
    }
    val iconSize = (profile.iconBase * iconScale).dp

    fun showMenu(app: AppInfo, r: Rect, source: MenuSource) {
        if (editMode && source != MenuSource.Library) return
        menu = MenuState(app, r, source)
        scope.launch {
            menuAnim.snapTo(0f)
            menuAnim.animateTo(1f, spring(dampingRatio = 0.68f, stiffness = 520f))
        }
    }

    fun dismissMenu() {
        scope.launch {
            menuAnim.animateTo(0f, tween(170))
            menu = null
        }
    }

    fun launchApp(app: AppInfo, r: Rect) {
        if (editMode) return
        // Hide the keyboard first so its own animation doesn't fight the app opening.
        focusManager.clearFocus(force = true)
        keyboard?.hide()
        Actions.launch(activity, app, r)
        // Tidy up while the app is still covering us, so the frame Android shows
        // when we come back is the clean home screen (not a half-closed sheet).
        scope.launch {
            delay(180)
            overlay.snapClosed()
            menu = null
            menuAnim.snapTo(0f)
        }
    }

    fun playUnlock() {
        scope.launch {
            entrance.snapTo(1f)
            unlock.snapTo(0f)
            unlock.animateTo(1f, spring(dampingRatio = 0.78f, stiffness = 120f))
        }
    }

    fun applyWallpaper(block: suspend () -> Boolean, id: Int) {
        if (applying) return
        applying = true
        scope.launch {
            val ok = withContext(Dispatchers.IO) { block() }
            applying = false
            if (ok) {
                seenSystemId[0] = Wallpapers.systemId(ctx)
                prefs.setWallpaper(id)
            } else {
                Toast.makeText(ctx, "Couldn't set the wallpaper", Toast.LENGTH_SHORT).show()
            }
        }
    }

    val pickPhoto = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) applyWallpaper({ Wallpapers.applyPhoto(ctx, prefs, uri, lockToo) }, -1)
    }

    fun removeWidget(list: List<String>, spec: String, save: (List<String>) -> Unit) {
        save(list - spec)
        appWidgetId(spec)?.let { widgets.delete(it) }
    }

    // Wallpaper changed anywhere in the system -> reload.
    DisposableEffect(Unit) {
        val wm = WallpaperManager.getInstance(ctx)
        val l = WallpaperManager.OnColorsChangedListener { _, which ->
            if (which and WallpaperManager.FLAG_SYSTEM != 0) {
                val id = Wallpapers.systemId(ctx)
                if (id != seenSystemId[0]) {
                    seenSystemId[0] = id
                    prefs.setWallpaper(-2)
                }
                wallpaperReload++
            }
        }
        runCatching { wm.addOnColorsChangedListener(l, Handler(Looper.getMainLooper())) }
        onDispose { runCatching { wm.removeOnColorsChangedListener(l) } }
    }

    // Lifecycle: close transient UI on leave; zoom back in on return; iPhone-style unlock effect.
    val lifecycleOwner = LocalLifecycleOwner.current
    val pendingUnlock = remember { booleanArrayOf(false) }
    DisposableEffect(lifecycleOwner) {
        var stopped = false
        val km = ctx.getSystemService(KeyguardManager::class.java)
        val obs = LifecycleEventObserver { _, ev ->
            when (ev) {
                Lifecycle.Event.ON_STOP -> {
                    stopped = true
                    overlay.snapClosed()
                    menu = null
                    scope.launch { menuAnim.snapTo(0f) }
                }
                Lifecycle.Event.ON_START -> {
                    val access = Wallpapers.hasSystemAccess()
                    val id = Wallpapers.systemId(ctx)
                    if (access != hasAccess || id != seenSystemId[0]) {
                        if (id != seenSystemId[0]) prefs.setWallpaper(-2)
                        hasAccess = access
                        seenSystemId[0] = id
                        wallpaperReload++
                    }
                    if (pendingUnlock[0] && km?.isKeyguardLocked != true) {
                        pendingUnlock[0] = false
                        stopped = false
                        playUnlock()
                    } else {
                        // Returning from an app: Android plays its own close animation.
                        // Don't run a second one on top of it (that was the glitch).
                        stopped = false
                        scope.launch { entrance.snapTo(1f) }
                    }
                }
                Lifecycle.Event.ON_RESUME -> if (pendingUnlock[0] && km?.isKeyguardLocked != true) {
                    // Safety net in case USER_PRESENT never arrives.
                    pendingUnlock[0] = false
                    stopped = false
                    playUnlock()
                }
                else -> Unit
            }
        }
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, i: Intent) {
                when (i.action) {
                    Intent.ACTION_SCREEN_OFF -> if (lifecycleOwner.lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) {
                        pendingUnlock[0] = true
                        scope.launch { unlock.snapTo(0f) }
                    }
                    // Unlocked: always play. If we're not on screen yet, the animation simply
                    // waits for our first frame, so the icons can never stay hidden.
                    Intent.ACTION_USER_PRESENT -> if (pendingUnlock[0]) {
                        pendingUnlock[0] = false
                        playUnlock()
                    }
                }
            }
        }
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        ContextCompat.registerReceiver(ctx, receiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        lifecycleOwner.lifecycle.addObserver(obs)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(obs)
            runCatching { ctx.unregisterReceiver(receiver) }
        }
    }

    // Extra safety net: the launcher only gets window focus once the lock screen is gone.
    val windowInfo = LocalWindowInfo.current
    LaunchedEffect(windowInfo) {
        snapshotFlow { windowInfo.isWindowFocused }.collect { focused ->
            if (focused && pendingUnlock[0]) {
                pendingUnlock[0] = false
                playUnlock()
            } else if (focused && unlock.targetValue < 1f && !unlock.isRunning) {
                playUnlock()
            }
        }
    }

    BackHandler(enabled = true) {
        when {
            menu != null -> dismissMenu()
            pickerTarget != null -> pickerTarget = null
            settingsOpen -> settingsOpen = false
            overlay.isOpen -> overlay.close()
            editMode -> editMode = false
        }
    }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val density = LocalDensity.current
        val rootSize = IntSize(constraints.maxWidth, constraints.maxHeight)

        var wallpaper by remember { mutableStateOf<WallpaperSet?>(null) }
        LaunchedEffect(wallpaperVersion, wallpaperReload, hasAccess) {
            wallpaper = withContext(Dispatchers.Default) { Wallpapers.resolve(ctx, prefs) }
        }

        // Grid sizing for the current orientation.
        val insets = WindowInsets.systemBars
        val topInset = with(density) { insets.getTop(this).toDp() }
        val bottomInset = with(density) { insets.getBottom(this).toDp() }
        val dotsH = 30.dp
        // Dock icons shrink if the dock would not fit the screen width.
        val dockN = dockApps.size.coerceAtLeast(1)
        val dockIcon = minOf(iconSize, (maxWidth - 24.dp - 28.dp - profile.dockSpacing * (dockN - 1)) / dockN)
        val dockArea = dockIcon + 24.dp + 14.dp
        val gridH = maxHeight - topInset - bottomInset - profile.topReserve - dotsH - dockArea
        val hPad = if (phone) 14.dp else if (maxWidth > 900.dp) 48.dp else 28.dp
        val gridW = maxWidth - hPad * 2
        val cellW = profile.cellW * iconScale.coerceAtLeast(0.9f)
        val cellH = (iconSize + profile.cellExtraH).coerceAtLeast(profile.cellMinH)
        val autoCols = (gridW / cellW).toInt().coerceIn(profile.colRange.first, profile.colRange.last)
        val autoRows = (gridH / cellH).toInt().coerceIn(profile.rowRange.first, profile.rowRange.last)
        val cols = if (homeColsPref > 0) homeColsPref else autoCols
        val rows = if (homeRowsPref > 0) homeRowsPref else autoRows
        // Icons shrink to fit when the user asks for a denser grid.
        val cellWAct = gridW / cols
        val cellHAct = gridH / rows
        val labelSpace = if (showLabels) 32.dp else 8.dp
        val homeIcon = minOf(iconSize, cellWAct - 14.dp, cellHAct - labelSpace).coerceAtLeast(30.dp)
        val homeLabelW = cellWAct - 4.dp

        // App Library sizing.
        val libIcon = (profile.iconBase * libIconScale).dp
        val libWidth = minOf(maxWidth, 1180.dp) - 48.dp
        val autoLibCols = (libWidth / (libIcon + profile.searchCellExtra)).toInt().coerceAtLeast(3)
        val libCols = if (libColsPref > 0) libColsPref else autoLibCols
        val libCell = libWidth / libCols
        val libIconEff = minOf(libIcon, libCell - 14.dp).coerceAtLeast(30.dp)
        val widgetRows = if (homeWidgets.isNotEmpty() && rows >= 4) 2 else 0
        val grid = Grid(cols, rows, widgetRows)
        val maxHomeWidgets = if (phone) 2 else (cols / 2 - 1).coerceAtLeast(2)
        val pages = remember(homeApps, cols, rows, widgetRows) {
            val first = (rows - widgetRows) * cols
            val per = rows * cols
            val out = mutableListOf(homeApps.take(first))
            var i = first
            while (i < homeApps.size) {
                out += homeApps.subList(i, minOf(i + per, homeApps.size))
                i += per
            }
            out.toList()
        }
        // Page 0 is the Today view; home pages start at 1.
        val pageCount by rememberUpdatedState(pages.size + 1)
        val pagerState = rememberPagerState(initialPage = 1) { pageCount }

        LaunchedEffect(Unit) {
            activity.homeEvents.collect {
                when {
                    menu != null -> dismissMenu()
                    pickerTarget != null -> pickerTarget = null
                    settingsOpen -> settingsOpen = false
                    overlay.isOpen -> overlay.close()
                    editMode -> editMode = false
                    else -> pagerState.animateScrollToPage(1)
                }
            }
        }

        val glassRoot = remember { GlassRoot() }
        val currentEdit by rememberUpdatedState(editMode)
        val now = rememberNow()

        // ---------- Home layer (recedes and blurs behind overlays) ----------
        Box(
            Modifier
                .fillMaxSize()
                .graphicsLayer {
                    val p = overlay.progress
                    val m = menuAnim.value
                    val s = maxOf(settingsAnim.value, pickerAnim.value)
                    val blurDp = maxOf(p * 34f, m * 24f, s * 28f)
                    val sc = 1f - 0.07f * p - 0.025f * m - 0.04f * s
                    scaleX = sc
                    scaleY = sc
                    val px = blurDp.dp.toPx()
                    renderEffect = if (px > 0.5f) BlurEffect(px, px, TileMode.Clamp) else null
                }
                .pointerInput(topInset) {
                    val dist = 520.dp.toPx()
                    val topEdge = topInset.toPx() + 40.dp.toPx()
                    val tracker = VelocityTracker()
                    var mode = 0 // 1 = up (library), 2 = down (search), 3 = notifications
                    var startY = 0f
                    var travelled = 0f
                    detectVerticalDragGestures(
                        onDragStart = { o ->
                            startY = o.y; mode = 0; travelled = 0f
                            tracker.resetTracking()
                        },
                        onDragEnd = {
                            if (mode == 1 || mode == 2) {
                                val v = tracker.calculateVelocity().y
                                val towardOpen = if (mode == 1) -v else v
                                overlay.settle(
                                    open = towardOpen > 700f || (overlay.progress > 0.3f && towardOpen > -300f),
                                    velocity = towardOpen / dist,
                                )
                            }
                        },
                        onDragCancel = { if (mode == 1 || mode == 2) overlay.settle(overlay.progress > 0.5f) },
                    ) { change, dy ->
                        tracker.addPosition(change.uptimeMillis, change.position)
                        if (mode == 0) {
                            mode = when {
                                dy < 0 -> 1
                                startY < topEdge -> 3
                                else -> 2
                            }
                            if (mode != 3) {
                                if (currentEdit) editMode = false
                                overlay.begin(fromTop = mode == 2)
                            }
                        }
                        travelled += dy
                        when (mode) {
                            3 -> if (travelled > 48.dp.toPx()) {
                                Actions.expandNotifications(ctx)
                                mode = 4
                            }
                            1 -> overlay.dragBy(-dy / dist)
                            2 -> overlay.dragBy(dy / dist)
                        }
                        change.consume()
                    }
                },
        ) {
            // The sharp wallpaper is drawn by Android behind this window (fast, always in sync).
            // On top we fade in a pre-blurred copy: behind sheets/menus, and on unlock it starts
            // zoomed-in and blurred, then shrinks and fades to reveal the sharp one (like iPhone).
            wallpaper?.let { wp ->
                Image(
                    wp.blurred, null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            val u = unlock.value
                            val sheets = maxOf(overlay.progress, menuAnim.value, settingsAnim.value, pickerAnim.value)
                            val unlockA = ((1f - u) * 1.5f).coerceIn(0f, 1f)
                            alpha = maxOf(unlockA, sheets.coerceIn(0f, 1f))
                            val sc = 1f + 0.16f * (1f - u)
                            scaleX = sc
                            scaleY = sc
                        },
                )
            }
            // Content layer: icons fly in from slightly larger and fade in.
            Box(
                Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        val u = unlock.value
                        val e = entrance.value
                        val uc = ((u - 0.12f) / 0.88f).coerceAtLeast(0f)
                        val sc = (1f + 0.32f * (1f - uc)) * (1f + 0.09f * (1f - e))
                        scaleX = sc
                        scaleY = sc
                        alpha = uc.coerceIn(0f, 1f) * (0.55f + 0.45f * e.coerceIn(0f, 1f))
                    }
                    .onGloballyPositioned { glassRoot.coords = it },
            ) {
                CompositionLocalProvider(
                    LocalGlass provides GlassEnv(wallpaper?.blurred, rootSize, glassRoot),
                    LocalContentColor provides Color.White,
                ) {
                    Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.systemBars)) {
                        Spacer(Modifier.height(profile.topReserve))
                        HorizontalPager(
                            state = pagerState,
                            modifier = Modifier.fillMaxWidth().weight(1f),
                            beyondViewportPageCount = 1,
                            flingBehavior = PagerDefaults.flingBehavior(
                                state = pagerState,
                                snapAnimationSpec = spring(dampingRatio = 0.92f, stiffness = 420f),
                            ),
                        ) { page ->
                            if (page == 0) {
                                TodayPage(
                                    items = todayWidgets,
                                    now = now,
                                    controller = widgets,
                                    cols = profile.todayCols,
                                    hPad = hPad,
                                    editMode = editMode,
                                    onEnterEdit = { editMode = true },
                                    onExitEdit = { editMode = false },
                                    onAdd = { pickerTarget = "today"; lastPickerTarget = "today" },
                                    onRemove = { spec -> removeWidget(todayWidgets, spec, prefs::setTodayWidgets) },
                                )
                            } else {
                                HomePage(
                                    apps = pages.getOrElse(page - 1) { emptyList() },
                                    grid = grid,
                                    widgets = if (page == 1 && widgetRows > 0) homeWidgets.take(maxHomeWidgets) else emptyList(),
                                    now = now,
                                    controller = widgets,
                                    hPad = hPad,
                                    iconSize = homeIcon,
                                    labelWidth = homeLabelW,
                                    showLabels = showLabels,
                                    editMode = editMode,
                                    onEnterEdit = { editMode = true },
                                    onExitEdit = { editMode = false },
                                    onLaunch = ::launchApp,
                                    onMenu = { a, r -> showMenu(a, r, MenuSource.Home) },
                                    onRemove = { prefs.hide(it.key) },
                                    onRemoveWidget = { spec -> removeWidget(homeWidgets, spec, prefs::setHomeWidgets) },
                                )
                            }
                        }
                        PageDots(pagerState, pages.size, Modifier.fillMaxWidth().height(dotsH))
                        Box(
                            Modifier.fillMaxWidth().height(dockArea).padding(bottom = 14.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Dock(
                                apps = dockApps,
                                iconSize = dockIcon,
                                spacing = profile.dockSpacing,
                                editMode = editMode,
                                onLaunch = ::launchApp,
                                onMenu = { a, r -> showMenu(a, r, MenuSource.Dock) },
                                onRemove = { prefs.toggleDock(it.key, profile.dockMax) },
                            )
                        }
                    }
                    if (editMode) {
                        Row(
                            Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 18.dp, vertical = 2.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                GlassPill("+ Widget") {
                                    val t = if (pagerState.currentPage == 0) "today" else "home"
                                    pickerTarget = t
                                    lastPickerTarget = t
                                }
                                GlassPill("Settings") { settingsOpen = true }
                            }
                            GlassPill("Done", bold = true) { editMode = false }
                        }
                    } else if (wallpaper == null && !hasAccess && !bannerDismissed) {
                        AccessBanner(
                            onAllow = { runCatching { ctx.startActivity(Wallpapers.accessIntent(ctx)) } },
                            onDismiss = prefs::dismissBanner,
                            modifier = Modifier.align(Alignment.TopCenter).statusBarsPadding(),
                        )
                    }
                }
            }
        }

        CompositionLocalProvider(LocalContentColor provides Color.White) {
            if (overlayOpen) {
                SpotlightOverlay(
                    ctrl = overlay,
                    apps = apps,
                    iconSize = libIconEff,
                    columns = GridCells.Fixed(libCols),
                    labelWidth = libCell - 4.dp,
                    onLaunch = { a, r -> launchApp(a, r) },
                    onLongClick = { a, r -> showMenu(a, r, MenuSource.Library) },
                    onWebSearch = { Actions.webSearch(ctx, it) },
                )
            }

            if (settingsVisible || settingsOpen) {
                SettingsSheet(
                    progress = { settingsAnim.value },
                    wallpaperId = wallpaperId,
                    showLabels = showLabels,
                    layout = LayoutSettings(
                        shape = iconShape,
                        onShape = prefs::setIconShape,
                        homeScale = iconScale,
                        homeCols = homeColsPref,
                        homeRows = homeRowsPref,
                        autoCols = autoCols,
                        autoRows = autoRows,
                        colRange = profile.userColRange,
                        rowRange = profile.userRowRange,
                        libScale = libIconScale,
                        libCols = libColsPref,
                        autoLibCols = autoLibCols,
                        libRange = profile.libRange,
                        onHomeScale = prefs::setIconScale,
                        onHomeCols = prefs::setHomeCols,
                        onHomeRows = prefs::setHomeRows,
                        onLibScale = prefs::setLibIconScale,
                        onLibCols = prefs::setLibCols,
                    ),
                    hiddenCount = hidden.size,
                    hasAccess = hasAccess,
                    lockToo = lockToo,
                    onRequestAccess = { runCatching { ctx.startActivity(Wallpapers.accessIntent(ctx)) } },
                    onLockToo = prefs::setLockToo,
                    onWallpaper = { i -> applyWallpaper({ Wallpapers.applyPreset(ctx, prefs, i, lockToo) }, i) },
                    onPickPhoto = { pickPhoto.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    onLabels = prefs::setShowLabels,
                    onRestoreHidden = prefs::unhideAll,
                    onDefaultHome = { Actions.homeSettings(ctx) },
                    onDismiss = { settingsOpen = false },
                )
            }

            if (pickerVisible || pickerTarget != null) {
                val target = pickerTarget ?: lastPickerTarget
                fun addSpec(spec: String) {
                    if (target == "today") {
                        prefs.setTodayWidgets(todayWidgets + spec)
                    } else {
                        if (homeWidgets.size >= maxHomeWidgets) {
                            Toast.makeText(ctx, "Home row is full — added to Today instead", Toast.LENGTH_SHORT).show()
                            prefs.setTodayWidgets(todayWidgets + spec)
                        } else {
                            prefs.setHomeWidgets(homeWidgets + spec)
                        }
                    }
                }
                WidgetPicker(
                    progress = { pickerAnim.value },
                    controller = widgets,
                    targetName = if (target == "today") "Today view" else "Home Screen",
                    onPickBuiltin = { spec ->
                        addSpec(spec)
                        pickerTarget = null
                    },
                    onPickAndroid = { info ->
                        pickerTarget = null
                        widgets.add(info) { id -> addSpec("aw:$id") }
                    },
                    onDismiss = { pickerTarget = null },
                )
            }

            menu?.let { m ->
                val inDock = m.app.key in dockKeys
                val actions = buildList {
                    if (m.source == MenuSource.Home) add(MenuAction("Edit Home Screen", Icons.Default.Edit) { editMode = true })
                    if (m.source == MenuSource.Library && m.app.key in hidden) {
                        add(MenuAction("Add to Home Screen", Icons.Default.Add) { prefs.unhide(m.app.key) })
                    }
                    add(
                        MenuAction(if (inDock) "Remove from Dock" else "Add to Dock", if (inDock) Icons.Default.Close else Icons.Default.Star) {
                            if (!prefs.toggleDock(m.app.key, profile.dockMax)) {
                                Toast.makeText(ctx, "Dock is full (${profile.dockMax} apps)", Toast.LENGTH_SHORT).show()
                            }
                        },
                    )
                    if (m.source == MenuSource.Home) add(MenuAction("Remove from Home Screen", Icons.Default.Clear) { prefs.hide(m.app.key) })
                    add(MenuAction("App Info", Icons.Default.Info) { Actions.appInfo(ctx, m.app) })
                    add(MenuAction("Uninstall", Icons.Default.Delete, destructive = true) { Actions.uninstall(ctx, m.app) })
                }
                ContextMenuOverlay(m, { menuAnim.value }, actions, ::dismissMenu)
            }
        }
    }
}

@Composable
private fun AccessBanner(onAllow: () -> Unit, onDismiss: () -> Unit, modifier: Modifier) {
    GlassPanel(modifier.padding(top = 4.dp).widthIn(max = 520.dp).padding(horizontal = 16.dp), shape = RoundedCornerShape(50)) {
        Row(Modifier.padding(start = 16.dp, end = 6.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "Allow wallpaper access for glass blur & unlock effect",
                color = Color.White, fontSize = 13.sp, modifier = Modifier.weight(1f, fill = false),
            )
            Spacer(Modifier.size(8.dp))
            Text(
                "Allow", color = Color(0xFF0A84FF), fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clip(RoundedCornerShape(50)).clickable(onClick = onAllow).padding(horizontal = 10.dp, vertical = 6.dp),
            )
            Icon(
                Icons.Default.Close, "Dismiss", tint = Color.White.copy(alpha = 0.7f),
                modifier = Modifier.size(30.dp).clip(CircleShape).clickable(onClick = onDismiss).padding(6.dp),
            )
        }
    }
}

@Composable
private fun TodayPage(
    items: List<String>,
    now: State<LocalDateTime>,
    controller: WidgetController,
    cols: Int,
    hPad: Dp,
    editMode: Boolean,
    onEnterEdit: () -> Unit,
    onExitEdit: () -> Unit,
    onAdd: () -> Unit,
    onRemove: (String) -> Unit,
) {
    val edit by rememberUpdatedState(editMode)
    val density = LocalDensity.current.density
    Column(
        Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTapGestures(onLongPress = { onEnterEdit() }, onTap = { if (edit) onExitEdit() })
            }
            .verticalScroll(rememberScrollState())
            .padding(horizontal = hPad + 8.dp),
    ) {
        val t = now.value
        Text(
            t.format(DateTimeFormatter.ofPattern("EEEE", Locale.getDefault())),
            color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Bold,
        )
        Text(
            t.format(DateTimeFormatter.ofPattern("d MMMM", Locale.getDefault())),
            color = Color.White.copy(alpha = 0.7f), fontSize = 20.sp, fontWeight = FontWeight.Medium,
        )
        Spacer(Modifier.height(18.dp))
        items.chunked(cols).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                row.forEach { spec ->
                    val h = when (spec) {
                        W_CLOCK -> 170f
                        W_CALENDAR -> 230f
                        W_BATTERY -> 170f
                        else -> appWidgetId(spec)?.let { controller.heightDp(it, density) } ?: 160f
                    }
                    androidx.compose.runtime.key(spec) {
                        WidgetSlot(
                            spec, now, controller, editMode, { onRemove(spec) },
                            Modifier.weight(1f).height(h.dp),
                        )
                    }
                }
                repeat(cols - row.size) { Spacer(Modifier.weight(1f)) }
            }
            Spacer(Modifier.height(18.dp))
        }
        Box(Modifier.fillMaxWidth().padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
            GlassPill(if (items.isEmpty()) "Add your first widget" else "Add Widget", onClick = onAdd)
        }
        Spacer(Modifier.height(40.dp))
    }
}

@Composable
private fun HomePage(
    apps: List<AppInfo>,
    grid: Grid,
    widgets: List<String>,
    now: State<LocalDateTime>,
    controller: WidgetController,
    hPad: Dp,
    iconSize: Dp,
    labelWidth: Dp,
    showLabels: Boolean,
    editMode: Boolean,
    onEnterEdit: () -> Unit,
    onExitEdit: () -> Unit,
    onLaunch: (AppInfo, Rect) -> Unit,
    onMenu: (AppInfo, Rect) -> Unit,
    onRemove: (AppInfo) -> Unit,
    onRemoveWidget: (String) -> Unit,
) {
    val edit by rememberUpdatedState(editMode)
    val density = LocalDensity.current.density
    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = hPad)
            .pointerInput(Unit) {
                detectTapGestures(
                    onLongPress = { onEnterEdit() },
                    onTap = { if (edit) onExitEdit() },
                )
            },
    ) {
        val widgetRows = if (widgets.isNotEmpty()) grid.widgetRows else 0
        if (widgetRows > 0) {
            Row(
                Modifier.fillMaxWidth().weight(widgetRows.toFloat()).padding(horizontal = 10.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                widgets.forEach { spec ->
                    val w = when (spec) {
                        W_CLOCK -> if (grid.cols >= 7) 1.7f else 1.3f
                        W_CALENDAR, W_BATTERY -> 1f
                        else -> appWidgetId(spec)?.let { (controller.widthCells(it, density) / 2f).coerceIn(0.8f, 2.5f) } ?: 1f
                    }
                    androidx.compose.runtime.key(spec) {
                        WidgetSlot(
                            spec, now, controller, editMode, { onRemoveWidget(spec) },
                            Modifier.weight(w).fillMaxHeight(),
                        )
                    }
                }
            }
        }
        val rows = grid.rows - widgetRows
        for (r in 0 until rows) {
            Row(Modifier.fillMaxWidth().weight(1f)) {
                for (c in 0 until grid.cols) {
                    Box(Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.Center) {
                        val app = apps.getOrNull(r * grid.cols + c)
                        if (app != null) {
                            androidx.compose.runtime.key(app.key) {
                                AppIcon(
                                    app = app,
                                    iconSize = iconSize,
                                    showLabel = showLabels,
                                    jiggle = editMode,
                                    onClick = { rect -> onLaunch(app, rect) },
                                    onLongClick = { rect -> if (!edit) onMenu(app, rect) },
                                    onRemove = { onRemove(app) },
                                    labelWidth = labelWidth,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Dots for the home pages only (the Today page has none, like iOS). */
@Composable
private fun PageDots(state: PagerState, count: Int, modifier: Modifier) {
    val onToday by remember { derivedStateOf { state.currentPage == 0 } }
    val visibility by animateFloatAsState(if (onToday) 0f else 1f, label = "dotsVis")
    Box(modifier.graphicsLayer { alpha = visibility }, contentAlignment = Alignment.Center) {
        if (count > 1) {
            GlassPanel(shape = RoundedCornerShape(50), tint = Color.White.copy(alpha = 0.12f)) {
                Row(
                    Modifier.padding(horizontal = 11.dp, vertical = 7.dp),
                    horizontalArrangement = Arrangement.spacedBy(9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    repeat(count) { i ->
                        val selected by remember(i) { derivedStateOf { state.currentPage == i + 1 } }
                        val a by animateFloatAsState(if (selected) 1f else 0.4f, label = "dot")
                        Box(
                            Modifier
                                .size(7.dp)
                                .graphicsLayer { alpha = a }
                                .clip(CircleShape)
                                .background(Color.White),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun Dock(
    apps: List<AppInfo>,
    iconSize: Dp,
    spacing: Dp,
    editMode: Boolean,
    onLaunch: (AppInfo, Rect) -> Unit,
    onMenu: (AppInfo, Rect) -> Unit,
    onRemove: (AppInfo) -> Unit,
) {
    if (apps.isEmpty()) return
    GlassPanel(shape = RoundedCornerShape(iconSize * 0.32f + 14.dp), tint = Color.White.copy(alpha = 0.16f)) {
        Row(
            Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(spacing),
        ) {
            apps.forEach { app ->
                androidx.compose.runtime.key(app.key) {
                    AppIcon(
                        app = app,
                        iconSize = iconSize,
                        showLabel = false,
                        jiggle = editMode,
                        onClick = { r -> onLaunch(app, r) },
                        onLongClick = { r -> onMenu(app, r) },
                        onRemove = { onRemove(app) },
                    )
                }
            }
        }
    }
}
