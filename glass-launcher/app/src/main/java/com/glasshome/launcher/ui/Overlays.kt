package com.glasshome.launcher.ui

import androidx.compose.animation.core.animate
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.Velocity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.glasshome.launcher.data.AppInfo
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/** Drives the Search / App Library sheet. Progress 0 = closed, 1 = open; follows the finger. */
@Stable
class OverlayController(private val scope: CoroutineScope) {
    var progress by mutableFloatStateOf(0f)
        private set
    var fromTop by mutableStateOf(false)
    var wantsKeyboard by mutableStateOf(false)
    private var job: Job? = null

    val isOpen: Boolean get() = progress > 0f

    fun begin(fromTop: Boolean) {
        if (progress == 0f) {
            this.fromTop = fromTop
            wantsKeyboard = fromTop
        }
    }

    fun dragBy(delta: Float) {
        job?.cancel()
        progress = (progress + delta).coerceIn(0f, 1f)
    }

    fun settle(open: Boolean, velocity: Float = 0f) = animateTo(if (open) 1f else 0f, velocity)

    fun open(fromTop: Boolean) {
        this.fromTop = fromTop
        wantsKeyboard = fromTop
        animateTo(1f)
    }

    fun close() = animateTo(0f)

    fun snapClosed() {
        job?.cancel()
        progress = 0f
    }

    private fun animateTo(target: Float, velocity: Float = 0f) {
        job?.cancel()
        job = scope.launch {
            animate(progress, target, velocity, spring(dampingRatio = 0.9f, stiffness = 340f)) { v, _ ->
                progress = v.coerceIn(0f, 1f)
            }
        }
    }
}

@Composable
fun SpotlightOverlay(
    ctrl: OverlayController,
    apps: List<AppInfo>,
    iconSize: Dp,
    columns: GridCells,
    labelWidth: Dp,
    onLaunch: (AppInfo, androidx.compose.ui.geometry.Rect) -> Unit,
    onLongClick: (AppInfo, androidx.compose.ui.geometry.Rect) -> Unit,
    onWebSearch: (String) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    val focus = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current
    val keyboard = LocalSoftwareKeyboardController.current
    val density = LocalDensity.current
    val dist = with(density) { 520.dp.toPx() }

    val mostlyOpen by remember { derivedStateOf { ctrl.progress > 0.6f } }
    LaunchedEffect(mostlyOpen) {
        if (mostlyOpen && ctrl.wantsKeyboard) {
            runCatching { focus.requestFocus() }
            keyboard?.show()
        } else if (!mostlyOpen) {
            focusManager.clearFocus()
            keyboard?.hide()
        }
    }

    val connection = remember(ctrl) {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (source == NestedScrollSource.UserInput && available.y < 0 && ctrl.progress < 1f) {
                    ctrl.dragBy(-available.y / dist)
                    return Offset(0f, available.y)
                }
                if (source == NestedScrollSource.UserInput) keyboard?.hide()
                return Offset.Zero
            }

            override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
                if (source == NestedScrollSource.UserInput && available.y > 0) {
                    ctrl.dragBy(-available.y / dist)
                    return Offset(0f, available.y)
                }
                return Offset.Zero
            }

            override suspend fun onPreFling(available: Velocity): Velocity {
                if (ctrl.progress < 1f) {
                    val v = available.y
                    ctrl.settle(open = v < 1200f && (ctrl.progress > 0.7f || v < -600f), velocity = -v / dist)
                    return available
                }
                return Velocity.Zero
            }
        }
    }

    val q = query.trim()
    val results = remember(q, apps) {
        if (q.isEmpty()) apps
        else apps.filter { it.label.contains(q, ignoreCase = true) }
            .sortedBy { if (it.label.startsWith(q, ignoreCase = true)) 0 else 1 }
    }

    Box(
        Modifier
            .fillMaxSize()
            .graphicsLayer {
                val p = ctrl.progress
                alpha = p
                val dir = if (ctrl.fromTop) -1f else 1f
                translationY = (1f - p) * dir * 90.dp.toPx()
                val s = 0.96f + 0.04f * p
                scaleX = s; scaleY = s
            }
            .background(Color.Black.copy(alpha = 0.18f))
            .pointerInput(Unit) { detectTapGestures { ctrl.close() } },
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.systemBars),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(18.dp))
            SearchField(
                query, { query = it },
                onSearch = { if (results.isNotEmpty() && q.isNotEmpty()) onLaunch(results.first(), androidx.compose.ui.geometry.Rect.Zero) else if (q.isNotEmpty()) onWebSearch(q) },
                modifier = Modifier
                    .widthIn(max = 640.dp)
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .focusRequester(focus),
            )
            Spacer(Modifier.height(14.dp))
            val imeBottom = with(density) { WindowInsets.ime.getBottom(this).toDp() }
            LazyVerticalGrid(
                columns = columns,
                modifier = Modifier
                    .widthIn(max = 1180.dp)
                    .fillMaxWidth()
                    .weight(1f)
                    .nestedScroll(connection),
                contentPadding = PaddingValues(start = 24.dp, end = 24.dp, top = 6.dp, bottom = 32.dp + imeBottom),
            ) {
                item(span = { GridItemSpan(maxLineSpan) }) {
                    if (q.isEmpty()) {
                        Text(
                            "App Library",
                            color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(start = 8.dp, top = 8.dp, bottom = 10.dp),
                        )
                    } else {
                        Column {
                            WebSearchRow(q) { onWebSearch(q) }
                            Text(
                                if (results.isEmpty()) "No apps found" else "Apps",
                                color = Color.White.copy(alpha = 0.7f), fontSize = 15.sp, fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(start = 8.dp, top = 18.dp, bottom = 6.dp),
                            )
                        }
                    }
                }
                items(results, key = { it.key }) { app ->
                    Box(Modifier.padding(vertical = 12.dp).animateItem(), contentAlignment = Alignment.Center) {
                        AppIcon(
                            app = app,
                            iconSize = iconSize,
                            showLabel = true,
                            jiggle = false,
                            onClick = { r -> onLaunch(app, r) },
                            onLongClick = { r -> onLongClick(app, r) },
                            labelWidth = labelWidth,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchField(value: String, onChange: (String) -> Unit, onSearch: () -> Unit, modifier: Modifier) {
    Row(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White.copy(alpha = 0.18f))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Default.Search, null, tint = Color.White.copy(alpha = 0.75f), modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(10.dp))
        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) Text("Search", color = Color.White.copy(alpha = 0.55f), fontSize = 18.sp)
            BasicTextField(
                value = value,
                onValueChange = onChange,
                singleLine = true,
                textStyle = TextStyle(color = Color.White, fontSize = 18.sp),
                cursorBrush = SolidColor(Color.White),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { onSearch() }),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        if (value.isNotEmpty()) {
            Icon(
                Icons.Default.Clear, "Clear",
                tint = Color.White.copy(alpha = 0.75f),
                modifier = Modifier.size(22.dp).clip(RoundedCornerShape(50)).clickable { onChange("") },
            )
        }
    }
}

@Composable
private fun WebSearchRow(q: String, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White.copy(alpha = 0.14f))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(Icons.Default.Search, null, tint = Color(0xFF0A84FF), modifier = Modifier.size(22.dp))
        Text("Search the web for “$q”", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Medium)
    }
}
