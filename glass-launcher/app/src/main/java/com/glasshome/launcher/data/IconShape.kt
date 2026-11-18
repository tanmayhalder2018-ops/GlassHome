package com.glasshome.launcher.data

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sign
import kotlin.math.sin

/** Icon outlines. Points are produced in a unit box (0..1) so both Android and Compose paths can use them. */
enum class IconShape(val id: String, val label: String) {
    Squircle("squircle", "Samsung"),
    Rounded("rounded", "iPhone"),
    Circle("circle", "Circle"),
    Square("square", "Square");

    /** Outline as unit-box points; null means "rounded rectangle" with [cornerFraction]. */
    fun points(): List<Pair<Float, Float>>? = when (this) {
        Squircle -> superellipse(4.2f)
        Circle -> superellipse(2f)
        else -> null
    }

    val cornerFraction: Float get() = if (this == Square) 0.12f else 0.225f

    companion object {
        fun of(id: String?): IconShape = entries.firstOrNull { it.id == id } ?: Squircle

        private fun superellipse(n: Float): List<Pair<Float, Float>> = (0 until 180).map { i ->
            val t = Math.toRadians(i * 2.0)
            val c = cos(t)
            val s = sin(t)
            val x = sign(c) * abs(c).pow(2.0 / n)
            val y = sign(s) * abs(s).pow(2.0 / n)
            (0.5f + 0.5f * x.toFloat()) to (0.5f + 0.5f * y.toFloat())
        }
    }
}
