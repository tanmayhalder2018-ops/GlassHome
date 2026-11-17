package com.glasshome.launcher.ui

import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
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
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.glasshome.launcher.MainActivity
import com.glasshome.launcher.data.AppInfo
import com.glasshome.launcher.data.AppRepository
import com.glasshome.launcher.data.LauncherPrefs
import com.glasshome.launcher.data.MAX_DOCK
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.max

private val PreferredDock = listOf(
    "com.sec.android.app.sbrowser", "com.android.chrome", "com.google.android.youtube",
    "com.google.android.gm", "com.samsung.android.messaging", "com.whatsapp",
    "com.sec.android.gallery3d", "com.google.android.apps.photos", "com.sec.android.app.camera",
    "com.spotify.music", "com.google.android.apps.maps", "com.android.settings",
)

private fun defaultDock(apps: List<AppInfo>): List<String> {
    val picked = LinkedHashMap<String, String>()
    for (pkg in PreferredDock) {
        if (picked.size >= 6) break
        apps.firstOrNull { it.component.packageName == pkg }?.let { picked.putIfAbsent(pkg, it.key) }
    }
    if (picked.size < 4) apps.take(4 - picked.size).forEach { picked.putIfAbsent(it.component.packageName, it.key) }
    return picked.values.toList()
}

private class Grid(val cols: Int, val rows: Int, val widgetRows: Int)

@Composable
fun LauncherApp(activity: MainActivity, repo: AppRepository, prefs: LauncherPrefs) {
    val ctx = LocalContext.current
    val apps by repo.apps.collectAsStateWithLifecycle()
    val dockKeys by prefs.dock.collectAsState()
    val hidden by prefs.hidden.collectAsState()
    val wallpaperId by prefs.wallpaper.collectAsState()
    val wallpaperVersion by prefs.wallpaperVersion.collectAsState()
    val showLabels by prefs.showLabels.collectAsState()
    val iconScale by prefs.iconScale.collectAsState()

    val scope = rememberCoroutineScope()
    val overlay = remember { OverlayController(scope) }
    var editMode by remember { mutableStateOf(false) }
    var menu by remember { mutableStateOf<MenuState?>(null) }
    val menuAnim = remember { Animatable(0f) }
    var settingsOpen by remember { mutableStateOf(false) }
    val settingsAnim by animateFloatAsState(
        if (settingsOpen) 1f else 0f, spring(dampingRatio = 0.86f, stiffness = 320f), label = "settings",
    )
    val entrance = remember { Animatable(1f) }

    LaunchedEffect(apps) {
        if (apps.isNotEmpty() && !prefs.dockInitialized) prefs.setDock(defaultDock(apps))
    }

    val appByKey = remember(apps) { apps.associateBy { it.key } }
    val dockApps = remember(dockKeys, appByKey) { dockKeys.mapNotNull { appByKey[it] } }
    val homeApps = remember(apps, dockKeys, hidden) {
        val dockSet = dockKeys.toSet()
        apps.filter { it.key !in hidden && it.key !in dockSet }
    }
    val iconSize = (66f * iconScale).dp

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
        Actions.launch(activity, app, r)
    }

    val pickPhoto = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) scope.launch {
            val ok = withContext(Dispatchers.IO) { Wallpapers.saveCustom(ctx, uri) }
            if (ok) prefs.setWallpaper(-1) else Toast.makeText(ctx, "Couldn't load that photo", Toast.LENGTH_SHORT).show()
        }
    }

    // Close transient UI when an app opens; zoom the home screen back in when returning.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        var stopped = false
        val obs = LifecycleEventObserver { _, ev ->
            when (ev) {
                Lifecycle.Event.ON_STOP -> {
                    stopped = true
                    overlay.snapClosed()
                    menu = null
                    scope.launch { menuAnim.snapTo(0f) }
                }
                Lifecycle.Event.ON_START -> if (stopped) {
                    stopped = false
                    scope.launch {
                        entrance.snapTo(0f)
                        entrance.animateTo(1f, spring(dampingRatio = 0.82f, stiffness = 230f))
                    }
                }
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(obs)
        onDispose { lifecycleOwner.lifecycle.removeObserver(obs) }
    }

    BackHandler(enabled = true) {
        when {
            menu != null -> dismissMenu()
            settingsOpen -> settingsOpen = false
            overlay.isOpen -> overlay.close()
            editMode -> editMode = false
        }
    }

    BoxWithConstraints(Modifier.fillMaxSize().background(Color.Black)) {
        val density = LocalDensity.current
        val rootSize = IntSize(constraints.maxWidth, constraints.maxHeight)
        val maxDim = max(rootSize.width, rootSize.height)

        var wallpaper by remember { mutableStateOf<WallpaperSet?>(null) }
        LaunchedEffect(wallpaperId, wallpaperVersion, maxDim) {
            if (maxDim > 0) wallpaper = withContext(Dispatchers.Default) { Wallpapers.load(ctx, wallpaperId, maxDim) }
        }

        // Grid sizing for the current orientation.
        val insets = WindowInsets.systemBars
        val topInset = with(density) { insets.getTop(this).toDp() }
        val bottomInset = with(density) { insets.getBottom(this).toDp() }
        val topReserve = 40.dp
        val dotsH = 30.dp
        val dockArea = iconSize + 24.dp + 14.dp
        val gridH = maxHeight - topInset - bottomInset - topReserve - dotsH - dockArea
        val hPad = if (maxWidth > 900.dp) 48.dp else 28.dp
        val gridW = maxWidth - hPad * 2
        val cellW = 150.dp * iconScale.coerceAtLeast(0.9f)
        val cellH = (iconSize + 62.dp).coerceAtLeast(118.dp)
        val cols = (gridW / cellW).toInt().coerceIn(4, 9)
        val rows = (gridH / cellH).toInt().coerceIn(3, 7)
        val grid = Grid(cols, rows, if (rows >= 4) 2 else 0)
        val pages = remember(homeApps, cols, rows) {
            val first = (grid.rows - grid.widgetRows) * grid.cols
            val per = grid.rows * grid.cols
            val out = mutableListOf(homeApps.take(first))
            var i = first
            while (i < homeApps.size) {
                out += homeApps.subList(i, minOf(i + per, homeApps.size))
                i += per
            }
            out.toList()
        }
        val pageCount by rememberUpdatedState(pages.size)
        val pagerState = rememberPagerState { pageCount }

        LaunchedEffect(Unit) {
            activity.homeEvents.collect {
                when {
                    menu != null -> dismissMenu()
                    settingsOpen -> settingsOpen = false
                    overlay.isOpen -> overlay.close()
                    editMode -> editMode = false
                    else -> pagerState.animateScrollToPage(0)
                }
            }
        }

        val glassRoot = remember { GlassRoot() }
        val currentEdit by rememberUpdatedState(editMode)

        // ---------- Home layer: wallpaper + pages + dock (blurs & recedes behind overlays) ----------
        Box(
            Modifier
                .fillMaxSize()
                .graphicsLayer {
                    val p = overlay.progress
                    val m = menuAnim.value
                    val s = settingsAnim
                    val e = entrance.value
                    val blurDp = maxOf(p * 34f, m * 24f, s * 28f)
                    val sc = (1f - 0.07f * p - 0.025f * m - 0.04f * s) * (1f + 0.09f * (1f - e))
                    scaleX = sc
                    scaleY = sc
                    alpha = 0.55f + 0.45f * e
                    val px = blurDp.dp.toPx()
                    renderEffect = if (px > 0.5f) BlurEffect(px, px, TileMode.Clamp) else null
                }
                .onGloballyPositioned { glassRoot.coords = it }
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
            Crossfade(wallpaper, animationSpec = tween(450), label = "wallpaper") { wp ->
                if (wp != null) {
                    Image(wp.full, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                }
            }
            CompositionLocalProvider(
                LocalGlass provides GlassEnv(wallpaper?.blurred, rootSize, glassRoot),
                LocalContentColor provides Color.White,
            ) {
                Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.systemBars)) {
                    Spacer(Modifier.height(topReserve))
                    HorizontalPager(
                        state = pagerState,
                        modifier = Modifier.fillMaxWidth().weight(1f),
                        beyondViewportPageCount = 1,
                    ) { page ->
                        HomePage(
                            apps = pages.getOrElse(page) { emptyList() },
                            grid = grid,
                            showWidgets = page == 0 && grid.widgetRows > 0,
                            hPad = hPad,
                            iconSize = iconSize,
                            showLabels = showLabels,
                            editMode = editMode,
                            onEnterEdit = { editMode = true },
                            onExitEdit = { editMode = false },
                            onLaunch = ::launchApp,
                            onMenu = { a, r -> showMenu(a, r, MenuSource.Home) },
                            onRemove = { prefs.hide(it.key) },
                        )
                    }
                    PageDots(pagerState, pages.size, Modifier.fillMaxWidth().height(dotsH))
                    Box(
                        Modifier.fillMaxWidth().height(dockArea).padding(bottom = 14.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Dock(
                            apps = dockApps,
                            iconSize = iconSize,
                            editMode = editMode,
                            onLaunch = ::launchApp,
                            onMenu = { a, r -> showMenu(a, r, MenuSource.Dock) },
                            onRemove = { prefs.toggleDock(it.key) },
                        )
                    }
                }
                if (editMode) {
                    Row(
                        Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 24.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        GlassPill("Settings") { settingsOpen = true }
                        GlassPill("Done", bold = true) { editMode = false }
                    }
                }
            }
        }

        CompositionLocalProvider(LocalContentColor provides Color.White) {
            // ---------- Search / App Library ----------
            if (overlay.isOpen) {
                SpotlightOverlay(
                    ctrl = overlay,
                    apps = apps,
                    iconSize = iconSize,
                    showLabels = true,
                    onLaunch = { a, r -> launchApp(a, r) },
                    onLongClick = { a, r -> showMenu(a, r, MenuSource.Library) },
                    onWebSearch = { Actions.webSearch(ctx, it) },
                )
            }

            if (settingsAnim > 0.001f || settingsOpen) {
                SettingsSheet(
                    progress = { settingsAnim },
                    wallpaperId = wallpaperId,
                    showLabels = showLabels,
                    iconScale = iconScale,
                    hiddenCount = hidden.size,
                    onWallpaper = { prefs.setWallpaper(it) },
                    onPickPhoto = { pickPhoto.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    onLabels = prefs::setShowLabels,
                    onIconScale = prefs::setIconScale,
                    onRestoreHidden = prefs::unhideAll,
                    onDefaultHome = { Actions.homeSettings(ctx) },
                    onDismiss = { settingsOpen = false },
                )
            }

            // ---------- Long-press menu ----------
            menu?.let { m ->
                val inDock = m.app.key in dockKeys
                val actions = buildList {
                    if (m.source == MenuSource.Home) add(MenuAction("Edit Home Screen", Icons.Default.Edit) { editMode = true })
                    if (m.source == MenuSource.Library && m.app.key in hidden) {
                        add(MenuAction("Add to Home Screen", Icons.Default.Add) { prefs.unhide(m.app.key) })
                    }
                    add(
                        MenuAction(if (inDock) "Remove from Dock" else "Add to Dock", if (inDock) Icons.Default.Close else Icons.Default.Star) {
                            if (!prefs.toggleDock(m.app.key)) {
                                Toast.makeText(ctx, "Dock is full ($MAX_DOCK apps)", Toast.LENGTH_SHORT).show()
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
private fun HomePage(
    apps: List<AppInfo>,
    grid: Grid,
    showWidgets: Boolean,
    hPad: Dp,
    iconSize: Dp,
    showLabels: Boolean,
    editMode: Boolean,
    onEnterEdit: () -> Unit,
    onExitEdit: () -> Unit,
    onLaunch: (AppInfo, Rect) -> Unit,
    onMenu: (AppInfo, Rect) -> Unit,
    onRemove: (AppInfo) -> Unit,
) {
    val edit by rememberUpdatedState(editMode)
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
        val widgetRows = if (showWidgets) grid.widgetRows else 0
        if (widgetRows > 0) {
            WidgetsRow(
                grid.cols,
                Modifier.fillMaxWidth().weight(widgetRows.toFloat()).padding(horizontal = 12.dp, vertical = 10.dp),
            )
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
                                    onLongClick = { rect -> if (edit) Unit else onMenu(app, rect) },
                                    onRemove = { onRemove(app) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PageDots(state: PagerState, count: Int, modifier: Modifier) {
    Box(modifier, contentAlignment = Alignment.Center) {
        if (count > 1) {
            GlassPanel(shape = RoundedCornerShape(50), tint = Color.White.copy(alpha = 0.12f)) {
                Row(
                    Modifier.padding(horizontal = 11.dp, vertical = 7.dp),
                    horizontalArrangement = Arrangement.spacedBy(9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    repeat(count) { i ->
                        val selected = state.currentPage == i
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
    editMode: Boolean,
    onLaunch: (AppInfo, Rect) -> Unit,
    onMenu: (AppInfo, Rect) -> Unit,
    onRemove: (AppInfo) -> Unit,
) {
    if (apps.isEmpty()) return
    GlassPanel(shape = RoundedCornerShape(iconSize * 0.32f + 14.dp), tint = Color.White.copy(alpha = 0.16f)) {
        Row(
            Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(20.dp),
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
