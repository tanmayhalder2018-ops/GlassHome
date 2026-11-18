package com.glasshome.launcher.data

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sign
import kotlin.math.sin

/**
 * Icon outline chosen by the user.
 * [roundness] 0 = square, 1 = circle. [smooth] = continuous "squircle" corners like Samsung / iOS.
 */
data class IconShape(val roundness: Float, val smooth: Boolean) {

    /** Outline as unit-box points for smooth shapes; null means a plain rounded rectangle. */
    fun points(): List<Pair<Float, Float>>? {
        if (!smooth) return null
        val r = roundness.coerceIn(0f, 1f)
        return superellipse(2f + 10f * (1f - r))
    }

    /** Corner radius as a fraction of the icon size, for plain rounded rectangles. */
    val cornerFraction: Float get() = roundness.coerceIn(0f, 1f) * 0.5f

    companion object {
        val Default = IconShape(0.78f, true)

        val presets = listOf(
            "Square" to IconShape(0.12f, false),
            "iPhone" to IconShape(0.45f, false),
            "Samsung" to IconShape(0.78f, true),
            "Circle" to IconShape(1f, true),
        )

        private fun superellipse(n: Float): List<Pair<Float, Float>> = (0 until 240).map { i ->
            val t = Math.toRadians(i * 1.5)
            val c = cos(t)
            val s = sin(t)
            val x = sign(c) * abs(c).pow(2.0 / n)
            val y = sign(s) * abs(s).pow(2.0 / n)
            (0.5f + 0.5f * x.toFloat()) to (0.5f + 0.5f * y.toFloat())
        }
    }
}
