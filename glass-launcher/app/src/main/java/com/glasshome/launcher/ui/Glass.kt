package com.glasshome.launcher.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt

/** Holds the coordinates of the home layer, so glass panels know where they sit over the wallpaper. */
class GlassRoot {
    var coords: LayoutCoordinates? = null
}

@Immutable
class GlassEnv(val blurred: ImageBitmap?, val rootSize: IntSize, val root: GlassRoot)

val LocalGlass = compositionLocalOf { GlassEnv(null, IntSize.Zero, GlassRoot()) }

private val vibrancy = ColorFilter.colorMatrix(ColorMatrix().apply { setToSaturation(1.6f) })

private val edge = Brush.verticalGradient(
    listOf(Color.White.copy(alpha = 0.55f), Color.White.copy(alpha = 0.10f), Color.White.copy(alpha = 0.22f)),
)

/**
 * Frosted glass: draws the pre-blurred wallpaper exactly behind this panel,
 * then a soft tint and a light edge, like iOS materials.
 */
@Composable
fun GlassPanel(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(28.dp),
    tint: Color = Color.White.copy(alpha = 0.14f),
    content: @Composable BoxScope.() -> Unit,
) {
    val env = LocalGlass.current
    var pos by remember { mutableStateOf(IntOffset.Zero) }
    val density = LocalDensity.current
    Box(
        modifier
            .clip(shape)
            .onGloballyPositioned { c ->
                val r = env.root.coords
                val p = if (r != null && r.isAttached && c.isAttached) r.localPositionOf(c, Offset.Zero) else c.positionInRoot()
                pos = IntOffset(p.x.roundToInt(), p.y.roundToInt())
            },
    ) {
        val bmp = env.blurred
        if (bmp != null && env.rootSize != IntSize.Zero) {
            val w = with(density) { env.rootSize.width.toDp() }
            val h = with(density) { env.rootSize.height.toDp() }
            Image(
                bitmap = bmp,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                colorFilter = vibrancy,
                modifier = Modifier
                    .matchParentSize()
                    .wrapContentSize(Alignment.TopStart, unbounded = true)
                    .requiredSize(w, h)
                    .graphicsLayer {
                        translationX = -pos.x.toFloat()
                        translationY = -pos.y.toFloat()
                    },
            )
        }
        Box(
            Modifier
                .matchParentSize()
                .background(tint)
                .border(0.8.dp, edge, shape),
        )
        content()
    }
}

/** Small capsule button made of glass, with a springy press. */
@Composable
fun GlassPill(text: String, modifier: Modifier = Modifier, bold: Boolean = false, onClick: () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.9f else 1f, spring(0.5f, 700f), label = "pill")
    GlassPanel(
        modifier
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clickable(interaction, null, onClick = onClick),
        shape = RoundedCornerShape(50),
        tint = Color.White.copy(alpha = 0.2f),
    ) {
        Text(
            text,
            color = Color.White,
            fontSize = 15.sp,
            fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 18.dp, vertical = 8.dp),
        )
    }
}
