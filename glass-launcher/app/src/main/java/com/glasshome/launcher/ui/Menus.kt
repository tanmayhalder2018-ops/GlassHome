package com.glasshome.launcher.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.glasshome.launcher.data.AppInfo
import kotlin.math.roundToInt

enum class MenuSource { Home, Dock, Library }

class MenuState(val app: AppInfo, val bounds: Rect, val source: MenuSource)

class MenuAction(val label: String, val icon: ImageVector, val destructive: Boolean = false, val run: () -> Unit)

private val MenuBg = Color(0xE0262628)
private val Divider = Color.White.copy(alpha = 0.1f)
private val Destructive = Color(0xFFFF453A)

/** iOS "haptic touch" menu: the icon lifts out of a blurred home screen with actions beside it. */
@Composable
fun ContextMenuOverlay(
    state: MenuState,
    progress: () -> Float,
    actions: List<MenuAction>,
    onDismiss: () -> Unit,
) {
    val b = state.bounds
    val density = LocalDensity.current
    val below = remember { booleanArrayOf(true) }
    Box(
        Modifier
            .fillMaxSize()
            .graphicsLayer { alpha = progress().coerceIn(0f, 1f) }
            .background(Color.Black.copy(alpha = 0.22f))
            .pointerInput(Unit) { detectTapGestures { onDismiss() } },
    ) {
        if (b.width > 0f) {
            Image(
                state.app.icon, null,
                modifier = Modifier
                    .layout { m, _ ->
                        val p = m.measure(Constraints.fixed(b.width.roundToInt(), b.height.roundToInt()))
                        layout(p.width, p.height) { p.place(0, 0) }
                    }
                    .graphicsLayer {
                        translationX = b.left
                        translationY = b.top
                        val s = 1f + 0.12f * progress()
                        scaleX = s; scaleY = s
                    },
            )
        }
        Column(
            Modifier
                .layout { m, c ->
                    val p = m.measure(c.copy(minWidth = 0, minHeight = 0))
                    val margin = 16.dp.roundToPx()
                    val gap = 18.dp.roundToPx()
                    val fitsBelow = b.bottom + gap + p.height < c.maxHeight - margin
                    below[0] = fitsBelow || b.top - gap - p.height < margin
                    val y = if (below[0]) b.bottom.roundToInt() + gap else b.top.roundToInt() - gap - p.height
                    val rawX = if (b.center.x > c.maxWidth / 2f) b.right.roundToInt() - p.width else b.left.roundToInt()
                    val x = rawX.coerceIn(margin, (c.maxWidth - p.width - margin).coerceAtLeast(margin))
                    layout(c.maxWidth, c.maxHeight) { p.place(x, y.coerceAtLeast(margin)) }
                }
                .graphicsLayer {
                    val p = progress()
                    val s = 0.55f + 0.45f * p
                    scaleX = s; scaleY = s
                    alpha = p.coerceIn(0f, 1f)
                    transformOrigin = TransformOrigin(0.5f, if (below[0]) 0f else 1f)
                }
                .width(270.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(MenuBg)
                .border(0.6.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(18.dp)),
        ) {
            actions.forEachIndexed { i, a ->
                if (i > 0) Box(Modifier.fillMaxWidth().height(0.6.dp).background(Divider))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clickable { a.run(); onDismiss() }
                        .padding(horizontal = 16.dp, vertical = 13.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    val c = if (a.destructive) Destructive else Color.White
                    Text(a.label, color = c, fontSize = 16.sp, modifier = Modifier.weight(1f))
                    Icon(a.icon, null, tint = c, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}

@Composable
fun SettingsSheet(
    progress: () -> Float,
    wallpaperId: Int,
    showLabels: Boolean,
    iconScale: Float,
    hiddenCount: Int,
    onWallpaper: (Int) -> Unit,
    onPickPhoto: () -> Unit,
    onLabels: (Boolean) -> Unit,
    onIconScale: (Float) -> Unit,
    onRestoreHidden: () -> Unit,
    onDefaultHome: () -> Unit,
    onDismiss: () -> Unit,
) {
    val thumbs = remember { Wallpapers.presets.map { Wallpapers.render(it, 180).asImageBitmap() } }
    val density = LocalDensity.current
    Box(
        Modifier
            .fillMaxSize()
            .graphicsLayer { alpha = progress().coerceIn(0f, 1f) }
            .background(Color.Black.copy(alpha = 0.25f))
            .pointerInput(Unit) { detectTapGestures { onDismiss() } },
        contentAlignment = Alignment.BottomCenter,
    ) {
        Column(
            Modifier
                .windowInsetsPadding(WindowInsets.navigationBars)
                .padding(16.dp)
                .widthIn(max = 600.dp)
                .fillMaxWidth()
                .graphicsLayer {
                    translationY = (1f - progress()) * with(density) { 420.dp.toPx() }
                }
                .clip(RoundedCornerShape(32.dp))
                .background(Color(0xEB1C1C1E))
                .border(0.6.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(32.dp))
                .pointerInput(Unit) { detectTapGestures { } }
                .padding(24.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Glass Launcher", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Box(
                    Modifier.size(34.dp).clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = 0.12f)).clickable(onClick = onDismiss),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Default.Close, "Close", tint = Color.White, modifier = Modifier.size(18.dp)) }
            }
            Spacer(Modifier.height(20.dp))
            SectionTitle("Wallpaper")
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                thumbs.forEachIndexed { i, t ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Image(
                            t, Wallpapers.presets[i].name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(width = 70.dp, height = 96.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .border(3.dp, if (wallpaperId == i) Color.White else Color.Transparent, RoundedCornerShape(14.dp))
                                .clickable { onWallpaper(i) },
                        )
                        Text(Wallpapers.presets[i].name, color = Color.White.copy(alpha = 0.7f), fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        Modifier
                            .size(width = 70.dp, height = 96.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color.White.copy(alpha = 0.12f))
                            .border(3.dp, if (wallpaperId < 0) Color.White else Color.Transparent, RoundedCornerShape(14.dp))
                            .clickable(onClick = onPickPhoto),
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.Default.Add, null, tint = Color.White) }
                    Text("Photo", color = Color.White.copy(alpha = 0.7f), fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
                }
            }
            Spacer(Modifier.height(22.dp))
            Group {
                Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Show app names", color = Color.White, fontSize = 16.sp, modifier = Modifier.weight(1f))
                    Switch(
                        checked = showLabels, onCheckedChange = onLabels,
                        colors = SwitchDefaults.colors(checkedTrackColor = Color(0xFF30D158), checkedThumbColor = Color.White),
                    )
                }
                Box(Modifier.fillMaxWidth().height(0.6.dp).background(Divider))
                Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Icon size", color = Color.White, fontSize = 16.sp, modifier = Modifier.weight(1f))
                    Row(
                        Modifier.clip(RoundedCornerShape(10.dp)).background(Color.White.copy(alpha = 0.1f)).padding(3.dp),
                    ) {
                        listOf("S" to 0.85f, "M" to 1f, "L" to 1.15f).forEach { (n, v) ->
                            val sel = kotlin.math.abs(iconScale - v) < 0.01f
                            Box(
                                Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (sel) Color.White.copy(alpha = 0.28f) else Color.Transparent)
                                    .clickable { onIconScale(v) }
                                    .padding(horizontal = 16.dp, vertical = 6.dp),
                            ) { Text(n, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold) }
                        }
                    }
                }
                if (hiddenCount > 0) {
                    Box(Modifier.fillMaxWidth().height(0.6.dp).background(Divider))
                    Row(
                        Modifier.fillMaxWidth().clickable(onClick = onRestoreHidden).padding(horizontal = 16.dp, vertical = 14.dp),
                    ) {
                        Text("Hidden apps", color = Color.White, fontSize = 16.sp, modifier = Modifier.weight(1f))
                        Text("Restore $hiddenCount", color = Color(0xFF0A84FF), fontSize = 16.sp)
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
            Group {
                Row(Modifier.fillMaxWidth().clickable(onClick = onDefaultHome).padding(horizontal = 16.dp, vertical = 14.dp)) {
                    Text("Set as default home app", color = Color(0xFF0A84FF), fontSize = 16.sp)
                }
            }
            Spacer(Modifier.height(16.dp))
            Text(
                "Swipe down to search · Swipe up for App Library · Swipe down from the top edge for notifications · Long-press an icon for options, or empty space to edit",
                color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp, lineHeight = 17.sp,
            )
        }
    }
}

@Composable
private fun SectionTitle(t: String) {
    Text(t.uppercase(), color = Color.White.copy(alpha = 0.55f), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp, modifier = Modifier.padding(bottom = 10.dp))
}

@Composable
private fun Group(content: @Composable () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = 0.08f)),
    ) { content() }
}
