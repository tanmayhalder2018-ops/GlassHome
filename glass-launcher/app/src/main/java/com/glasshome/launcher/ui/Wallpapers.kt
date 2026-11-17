package com.glasshome.launcher.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.ImageDecoder
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.net.Uri
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import java.io.File
import kotlin.math.max
import kotlin.math.roundToInt
import android.graphics.Color as AColor

class WallpaperSet(val full: ImageBitmap, val blurred: ImageBitmap)

class WallpaperPreset(val name: String, val from: String, val to: String, val blobs: List<Blob>)
class Blob(val color: String, val x: Float, val y: Float, val r: Float)

object Wallpapers {
    val presets = listOf(
        WallpaperPreset(
            "Aurora", "#0F0C29", "#302B63",
            listOf(Blob("#FF6FD8", 0.18f, 0.22f, 0.55f), Blob("#3813C2", 0.85f, 0.35f, 0.6f), Blob("#00D2FF", 0.55f, 0.95f, 0.6f)),
        ),
        WallpaperPreset(
            "Sunset", "#FF7E5F", "#FEB47B",
            listOf(Blob("#FF3CAC", 0.1f, 0.1f, 0.6f), Blob("#784BA0", 0.95f, 0.55f, 0.55f), Blob("#2B86C5", 0.3f, 1.0f, 0.6f)),
        ),
        WallpaperPreset(
            "Ocean", "#000851", "#1CB5E0",
            listOf(Blob("#00F5A0", 0.85f, 0.15f, 0.5f), Blob("#00D9F5", 0.15f, 0.65f, 0.55f), Blob("#4A00E0", 0.7f, 0.95f, 0.5f)),
        ),
        WallpaperPreset(
            "Midnight", "#141E30", "#243B55",
            listOf(Blob("#8E2DE2", 0.2f, 0.3f, 0.5f), Blob("#FF0080", 0.9f, 0.8f, 0.45f), Blob("#4A00E0", 0.6f, 0.05f, 0.45f)),
        ),
        WallpaperPreset(
            "Bloom", "#FBC2EB", "#A6C1EE",
            listOf(Blob("#FF9A8B", 0.15f, 0.2f, 0.5f), Blob("#84FAB0", 0.85f, 0.75f, 0.5f), Blob("#8FD3F4", 0.7f, 0.15f, 0.45f)),
        ),
        WallpaperPreset(
            "Ember", "#1A0000", "#3A0A0A",
            listOf(Blob("#FF512F", 0.25f, 0.75f, 0.55f), Blob("#F09819", 0.8f, 0.3f, 0.45f), Blob("#DD2476", 0.6f, 0.9f, 0.45f)),
        ),
    )

    fun render(preset: WallpaperPreset, size: Int): Bitmap {
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        val s = size.toFloat()
        val p = Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG)
        p.shader = LinearGradient(0f, 0f, s * 0.4f, s, AColor.parseColor(preset.from), AColor.parseColor(preset.to), Shader.TileMode.CLAMP)
        c.drawRect(0f, 0f, s, s, p)
        for (b in preset.blobs) {
            val col = AColor.parseColor(b.color)
            p.shader = RadialGradient(
                b.x * s, b.y * s, b.r * s,
                intArrayOf(col, (col and 0x00FFFFFF) or (0x88 shl 24), col and 0x00FFFFFF),
                floatArrayOf(0f, 0.45f, 1f), Shader.TileMode.CLAMP,
            )
            c.drawRect(0f, 0f, s, s, p)
        }
        return bmp
    }

    private fun customFile(ctx: Context) = File(ctx.filesDir, "wallpaper.jpg")

    fun saveCustom(ctx: Context, uri: Uri): Boolean = runCatching {
        val src = ImageDecoder.createSource(ctx.contentResolver, uri)
        val bmp = ImageDecoder.decodeBitmap(src) { decoder, info, _ ->
            decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
            val longest = max(info.size.width, info.size.height)
            var sample = 1
            while (longest / (sample * 2) >= 2400) sample *= 2
            decoder.setTargetSampleSize(sample)
        }
        customFile(ctx).outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, 92, it) }
        true
    }.getOrDefault(false)

    /** Builds the sharp wallpaper and a pre-blurred copy used by every glass surface. */
    fun load(ctx: Context, id: Int, maxDim: Int): WallpaperSet {
        val full: Bitmap = if (id < 0) {
            customFile(ctx).takeIf { it.exists() }?.let { BitmapFactory.decodeFile(it.path) }
                ?: render(presets[0], (maxDim / 2).coerceAtLeast(256))
        } else {
            render(presets[id.coerceIn(0, presets.lastIndex)], (maxDim / 2).coerceAtLeast(256))
        }
        val blurred = blur(full)
        full.prepareToDraw()
        return WallpaperSet(full.asImageBitmap(), blurred.asImageBitmap())
    }

    private fun blur(src: Bitmap): Bitmap {
        val targetW = 150
        var cur = src
        while (cur.width / 2 >= targetW) {
            val next = Bitmap.createScaledBitmap(cur, cur.width / 2, cur.height / 2, true)
            if (cur !== src) cur.recycle()
            cur = next
        }
        val th = (targetW * cur.height / cur.width.toFloat()).roundToInt().coerceAtLeast(1)
        val small = Bitmap.createScaledBitmap(cur, targetW, th, true)
        return boxBlur(small, 4, 3)
    }

    private fun boxBlur(bmp: Bitmap, radius: Int, passes: Int): Bitmap {
        val w = bmp.width
        val h = bmp.height
        val px = IntArray(w * h)
        bmp.getPixels(px, 0, w, 0, 0, w, h)
        val tmp = IntArray(w * h)
        repeat(passes) {
            pass(px, tmp, w, h, radius, true)
            pass(tmp, px, w, h, radius, false)
        }
        return Bitmap.createBitmap(px, w, h, Bitmap.Config.ARGB_8888)
    }

    private fun pass(src: IntArray, dst: IntArray, w: Int, h: Int, r: Int, horizontal: Boolean) {
        val len = if (horizontal) w else h
        val lines = if (horizontal) h else w
        val div = 2 * r + 1
        for (line in 0 until lines) {
            fun at(i: Int): Int {
                val k = i.coerceIn(0, len - 1)
                return if (horizontal) src[line * w + k] else src[k * w + line]
            }
            var a = 0; var rr = 0; var g = 0; var b = 0
            for (i in -r..r) {
                val c = at(i)
                a += c ushr 24; rr += (c shr 16) and 0xFF; g += (c shr 8) and 0xFF; b += c and 0xFF
            }
            for (i in 0 until len) {
                val out = ((a / div) shl 24) or ((rr / div) shl 16) or ((g / div) shl 8) or (b / div)
                if (horizontal) dst[line * w + i] = out else dst[i * w + line] = out
                val cOut = at(i - r)
                val cIn = at(i + r + 1)
                a += (cIn ushr 24) - (cOut ushr 24)
                rr += ((cIn shr 16) and 0xFF) - ((cOut shr 16) and 0xFF)
                g += ((cIn shr 8) and 0xFF) - ((cOut shr 8) and 0xFF)
                b += (cIn and 0xFF) - (cOut and 0xFF)
            }
        }
    }
}
