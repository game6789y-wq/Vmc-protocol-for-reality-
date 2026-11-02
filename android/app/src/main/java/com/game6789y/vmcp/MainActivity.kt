package com.game6789y.vmcp

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.view.Gravity
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private val background = Color.rgb(8, 15, 30)
    private val panel = Color.rgb(20, 31, 52)
    private val accent = Color.rgb(73, 196, 255)
    private val textColor = Color.rgb(238, 244, 255)
    private val muted = Color.rgb(165, 180, 205)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = background
        window.navigationBarColor = background
        window.decorView.systemUiVisibility = 0

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(28), dp(24), dp(24))
            setBackgroundColor(this@MainActivity.background)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        root.addView(label("VMC PROTOCOL", 13f, accent, true))
        root.addView(label("Reality Control", 30f, textColor, true).apply {
            setPadding(0, dp(8), 0, dp(6))
        })
        root.addView(label("Native Android preview • v0.1.0", 14f, muted, false))
        root.addView(space(24))
        root.addView(card(
            "ANDROID NATIVE BUILD",
            "This is the first native Android test shell for the VMC Protocol project. It is separate from the existing React web interface."
        ))
        root.addView(space(12))
        root.addView(card(
            "CURRENT STATUS",
            "App launched successfully. VMC network streaming and the 3D control interface are not connected in this initial native preview."
        ))
        root.addView(space(12))
        root.addView(card(
            "NEXT DEVELOPMENT STEP",
            "Port the VMC packet parser, OSC transport, and real-time avatar controls into Android-native components before a production release."
        ))
        root.addView(space(20))
        root.addView(label("TEST BUILD ONLY", 12f, accent, true))
        root.addView(label(
            "This APK uses Android's standard debug signing certificate. Do not treat it as a production release.",
            13f, muted, false
        ).apply { setPadding(0, dp(8), 0, 0) })
        setContentView(root)
    }

    private fun card(title: String, body: String): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(18))
            setBackgroundColor(panel)
            addView(label(title, 12f, accent, true))
            addView(label(body, 15f, textColor, false).apply {
                setPadding(0, dp(10), 0, 0)
            })
        }
    }

    private fun label(value: String, size: Float, color: Int, bold: Boolean): TextView =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            gravity = Gravity.START
            if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
            setLineSpacing(dp(3).toFloat(), 1f)
        }

    private fun space(heightDp: Int) = TextView(this).apply {
        height = dp(heightDp)
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()
}
