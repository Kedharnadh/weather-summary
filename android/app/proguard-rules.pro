# Gson reflects over DTO/model fields. Keep them when minification is enabled.
-keepattributes Signature
-keep class com.weathersummary.app.data.** { *; }