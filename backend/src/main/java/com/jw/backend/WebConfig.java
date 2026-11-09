package com.jw.backend;

import com.jw.backend.metrics.UsageTrackingInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final UsageTrackingInterceptor usageTrackingInterceptor;

    public WebConfig(UsageTrackingInterceptor usageTrackingInterceptor) {
        this.usageTrackingInterceptor = usageTrackingInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(usageTrackingInterceptor).addPathPatterns("/api/**");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/")
                .setCachePeriod(31536000)
                .resourceChain(true);

        registry.addResourceHandler("/index.html")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(0)
                .resourceChain(true);
    }
}
